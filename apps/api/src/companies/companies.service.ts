import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  COMPANY_LOGO_MAX_BYTES,
  COMPANY_PROFILE_KEYS,
  type CompanyInput,
  type CompanyProfile,
  type UpdateCompanyInput,
} from '@teczone/shared';
import type { Company, Prisma } from '@teczone/db';
import type { AuthUser } from '../auth/types';
import { COMPANY_PICK_ROLES, hasAnyRole, QUOTE_WRITE_ROLES } from '../common/access';
import { PrismaService } from '../prisma/prisma.service';

// Todo menos el logo, que se sirve aparte.
const publicSelect = {
  id: true,
  name: true,
  legalName: true,
  rfc: true,
  taxRegime: true,
  postalCode: true,
  address: true,
  phone: true,
  email: true,
  website: true,
  active: true,
  logoMime: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.CompanySelect;

export const toProfile = (c: Pick<Company, (typeof COMPANY_PROFILE_KEYS)[number]>): CompanyProfile =>
  Object.fromEntries(COMPANY_PROFILE_KEYS.map((k) => [k, c[k]])) as unknown as CompanyProfile;

// Catálogo de empresas emisoras de cotizaciones (FR-06).
@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(includeInactive: boolean) {
    const companies = await this.prisma.company.findMany({
      where: includeInactive ? {} : { active: true },
      select: { ...publicSelect, _count: { select: { quotes: true, defaultUsers: true } } },
      orderBy: { name: 'asc' },
    });
    return companies.map(({ _count, logoMime, ...c }) => ({
      ...c,
      hasLogo: !!logoMime,
      quoteCount: _count.quotes,
      userCount: _count.defaultUsers,
    }));
  }

  async create(input: CompanyInput, actor: AuthUser) {
    const company = await this.prisma.company.create({ data: input, select: publicSelect });
    await this.audit(company.id, 'create', actor, input);
    return company;
  }

  async update(id: string, input: UpdateCompanyInput, actor: AuthUser) {
    const current = await this.find(id);
    if (input.active === false && current.active) await this.assertCanDeactivate(id);
    const company = await this.prisma.company.update({ where: { id }, data: input, select: publicSelect });
    await this.audit(id, 'update', actor, input);
    return company;
  }

  // Integridad: una empresa con cotizaciones no se borra, solo se desactiva.
  async remove(id: string, actor: AuthUser) {
    const company = await this.find(id);
    const quotes = await this.prisma.quote.count({ where: { companyId: id } });
    if (quotes) {
      throw new ConflictException(
        `${company.name} tiene ${quotes} cotización${quotes === 1 ? '' : 'es'}; no se puede eliminar. Desactívala para que ya no se use.`,
      );
    }
    await this.assertNoUsers(id, 'eliminarla');
    if (company.active) await this.assertNotLastActive(id);
    await this.prisma.company.delete({ where: { id } });
    await this.audit(id, 'delete', actor, { name: company.name });
  }

  async setLogo(id: string, dataUrl: string, actor: AuthUser) {
    await this.find(id);
    const [, mime, base64] = /^data:(image\/(?:png|jpeg));base64,(.+)$/.exec(dataUrl) ?? [];
    if (!mime || !base64) throw new BadRequestException('El logo debe ser PNG o JPG');
    const logo = Buffer.from(base64, 'base64');
    if (logo.length > COMPANY_LOGO_MAX_BYTES) throw new BadRequestException('El logo debe pesar menos de 1 MB');
    // Firma del archivo: evita guardar algo que no es imagen aunque diga serlo.
    const png = logo.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const jpg = logo[0] === 0xff && logo[1] === 0xd8 && logo[2] === 0xff;
    if (!(mime === 'image/png' ? png : jpg)) throw new BadRequestException('El archivo no es una imagen PNG o JPG válida');
    await this.prisma.company.update({ where: { id }, data: { logo, logoMime: mime } });
    await this.audit(id, 'update', actor, { logo: mime });
  }

  async removeLogo(id: string, actor: AuthUser) {
    await this.find(id);
    await this.prisma.company.update({ where: { id }, data: { logo: null, logoMime: null } });
    await this.audit(id, 'update', actor, { logo: null });
  }

  async logo(id: string) {
    const c = await this.prisma.company.findUnique({ where: { id }, select: { logo: true, logoMime: true } });
    if (!c?.logo || !c.logoMime) throw new NotFoundException('La empresa no tiene logo');
    return { buffer: Buffer.from(c.logo), mime: c.logoMime };
  }

  // ---------- Empresa por omisión de cada usuario ----------

  // Quienes cotizan, con su empresa asignada.
  async assignments() {
    const users = await this.prisma.user.findMany({
      where: { active: true, roles: { some: { role: { in: QUOTE_WRITE_ROLES } } } },
      select: { id: true, name: true, email: true, defaultCompanyId: true, roles: { select: { role: true } } },
      orderBy: { name: 'asc' },
    });
    return users.map((u) => ({ ...u, roles: u.roles.map((r) => r.role) }));
  }

  async assign(userId: string, companyId: string | null, actor: AuthUser) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (companyId) {
      const company = await this.find(companyId);
      if (!company.active) throw new BadRequestException(`${company.name} está inactiva`);
    }
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { defaultCompanyId: companyId } }),
      this.prisma.auditLog.create({
        data: {
          entity: 'user',
          entityId: userId,
          action: 'update',
          userId: actor.id,
          changes: { defaultCompanyId: companyId, previous: user.defaultCompanyId },
        },
      }),
    ]);
    return { id: userId, defaultCompanyId: companyId };
  }

  // ---------- Uso desde cotizaciones ----------

  // Empresa de una cotización nueva: la elegida (solo gerencia), la asignada al responsable o
  // a quien cotiza, o la primera activa.
  async resolveForQuote(requested: string | undefined, ownerId: string, actor: AuthUser) {
    const assigned = await this.defaultFor([ownerId, actor.id]);
    if (requested && requested !== assigned?.id) {
      await this.assertPickable(requested, actor);
      return requested;
    }
    if (assigned) return assigned.id;
    const first = await this.prisma.company.findFirst({ where: { active: true }, orderBy: { createdAt: 'asc' } });
    if (!first) throw new BadRequestException('No hay empresas activas para cotizar. Da de alta una en Empresas.');
    return first.id;
  }

  async assertPickable(companyId: string, actor: AuthUser) {
    if (!hasAnyRole(actor, COMPANY_PICK_ROLES)) {
      throw new BadRequestException('Cotizas con la empresa que te asignó la gerencia; pide el cambio a tu gerente');
    }
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new BadRequestException('Empresa no encontrada');
    if (!company.active) throw new BadRequestException(`${company.name} está inactiva`);
  }

  private async defaultFor(userIds: string[]) {
    for (const id of userIds) {
      const u = await this.prisma.user.findUnique({ where: { id }, select: { defaultCompany: true } });
      if (u?.defaultCompany?.active) return u.defaultCompany;
    }
    return null;
  }

  // ---------- Apoyo ----------

  private async find(id: string) {
    const company = await this.prisma.company.findUnique({ where: { id }, select: publicSelect });
    if (!company) throw new NotFoundException('Empresa no encontrada');
    return company;
  }

  private async assertCanDeactivate(id: string) {
    await this.assertNoUsers(id, 'desactivarla');
    await this.assertNotLastActive(id);
  }

  private async assertNoUsers(id: string, action: string) {
    const users = await this.prisma.user.count({ where: { defaultCompanyId: id } });
    if (users) {
      throw new ConflictException(
        `${users} usuario${users === 1 ? ' la tiene' : 's la tienen'} como empresa por omisión; asígnales otra antes de ${action}.`,
      );
    }
  }

  private async assertNotLastActive(id: string) {
    const others = await this.prisma.company.count({ where: { active: true, id: { not: id } } });
    if (!others) throw new ConflictException('Debe quedar al menos una empresa activa para cotizar');
  }

  private audit(entityId: string, action: string, actor: AuthUser, changes: object) {
    return this.prisma.auditLog.create({
      data: { entity: 'company', entityId, action, userId: actor.id, changes: changes as Prisma.InputJsonValue },
    });
  }
}
