import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  normalizePhone,
  type AccountListQuery,
  type ContactInput,
  type CreateAccountInput,
  type UpdateAccountInput,
  type UpdateContactInput,
} from '@teczone/shared';
import { Prisma } from '@teczone/db';
import type { AuthUser } from '../auth/types';
import { OPPORTUNITY_FULL_ROLES, hasAnyRole } from '../common/access';
import { PrismaService } from '../prisma/prisma.service';
import { formatOpportunityFolio } from '../opportunities/opportunity-format';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AccountListQuery) {
    const where: Prisma.AccountWhereInput = {
      deletedAt: null,
      ...(query.q
        ? { OR: [{ name: { contains: query.q } }, { legalName: { contains: query.q } }, { rfc: { contains: query.q } }] }
        : {}),
    };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.account.count({ where }),
      this.prisma.account.findMany({
        where,
        include: {
          owner: { select: { id: true, name: true } },
          _count: { select: { contacts: { where: { deletedAt: null } }, opportunities: { where: { deletedAt: null } } } },
        },
        orderBy: { name: 'asc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return { total, page: query.page, pageSize: query.pageSize, items };
  }

  async get(id: string, user: AuthUser) {
    const account = await this.prisma.account.findFirst({
      where: { id, deletedAt: null },
      include: {
        owner: { select: { id: true, name: true } },
        contacts: { where: { deletedAt: null }, orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }] },
        opportunities: {
          where: {
            deletedAt: null,
            ...(hasAnyRole(user, OPPORTUNITY_FULL_ROLES) ? {} : { ownerId: user.id }),
          },
          include: { owner: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        leads: { select: { id: true, folioNumber: true, convertedAt: true } },
      },
    });
    if (!account) throw new NotFoundException('Cuenta no encontrada');
    return {
      ...account,
      opportunities: account.opportunities.map((o) => ({ ...o, folio: formatOpportunityFolio(o.folioNumber) })),
    };
  }

  async create(input: CreateAccountInput, user: AuthUser) {
    await this.assertRfcFree(input.rfc);
    const account = await this.prisma.account.create({
      data: { ...input, ownerId: input.ownerId ?? null, createdById: user.id },
    });
    await this.prisma.auditLog.create({
      data: { entity: 'account', entityId: account.id, action: 'create', userId: user.id },
    });
    return this.get(account.id, user);
  }

  async update(id: string, input: UpdateAccountInput, user: AuthUser) {
    await this.exists(id);
    if (input.rfc) await this.assertRfcFree(input.rfc, id);
    await this.prisma.$transaction([
      this.prisma.account.update({ where: { id }, data: input }),
      this.prisma.auditLog.create({
        data: { entity: 'account', entityId: id, action: 'update', userId: user.id, changes: input as Prisma.InputJsonValue },
      }),
    ]);
    return this.get(id, user);
  }

  async addContact(accountId: string, input: ContactInput, user: AuthUser) {
    await this.exists(accountId);
    return this.prisma.$transaction(async (tx) => {
      const hasPrimary = await tx.contact.count({ where: { accountId, isPrimary: true, deletedAt: null } });
      const makePrimary = input.isPrimary || !hasPrimary;
      if (makePrimary) {
        await tx.contact.updateMany({ where: { accountId }, data: { isPrimary: false } });
      }
      const contact = await tx.contact.create({
        data: { ...input, accountId, isPrimary: makePrimary, phoneNormalized: normalizePhone(input.phone ?? input.whatsapp) },
      });
      await tx.auditLog.create({
        data: { entity: 'contact', entityId: contact.id, action: 'create', userId: user.id },
      });
      return contact;
    });
  }

  async updateContact(accountId: string, contactId: string, input: UpdateContactInput, user: AuthUser) {
    const contact = await this.prisma.contact.findFirst({ where: { id: contactId, accountId, deletedAt: null } });
    if (!contact) throw new NotFoundException('Contacto no encontrado');
    return this.prisma.$transaction(async (tx) => {
      if (input.isPrimary) {
        await tx.contact.updateMany({ where: { accountId }, data: { isPrimary: false } });
      }
      const data: Prisma.ContactUpdateInput = { ...input };
      if (input.phone !== undefined || input.whatsapp !== undefined) {
        data.phoneNormalized = normalizePhone(
          (input.phone !== undefined ? input.phone : contact.phone) ??
            (input.whatsapp !== undefined ? input.whatsapp : contact.whatsapp),
        );
      }
      const updated = await tx.contact.update({ where: { id: contactId }, data });
      await tx.auditLog.create({
        data: { entity: 'contact', entityId: contactId, action: 'update', userId: user.id, changes: input as Prisma.InputJsonValue },
      });
      return updated;
    });
  }

  private async exists(id: string) {
    const account = await this.prisma.account.findFirst({ where: { id, deletedAt: null } });
    if (!account) throw new NotFoundException('Cuenta no encontrada');
    return account;
  }

  async assertRfcFree(rfc: string | null | undefined, exceptId?: string) {
    if (!rfc) return;
    const existing = await this.prisma.account.findUnique({ where: { rfc } });
    if (existing && existing.id !== exceptId) {
      throw new ConflictException({
        message: `Ya existe la cuenta ${existing.name} con ese RFC`,
        accountId: existing.id,
      });
    }
  }
}
