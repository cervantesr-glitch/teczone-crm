import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  addBusinessHours,
  canTransition,
  FIRST_CONTACT_SLA_HOURS,
  normalizePhone,
  qualificationScore,
  type ChangeLeadStatusInput,
  type CreateActivityInput,
  type CreateLeadInput,
  type DuplicateCheckInput,
  type LeadListQuery,
  type Qualification,
  type UpdateLeadInput,
} from '@teczone/shared';
import { Prisma, type Lead } from '@teczone/db';
import type { AuthUser } from '../auth/types';
import { PrismaService } from '../prisma/prisma.service';
import {
  canAssignLeads,
  canWriteLeads,
  formatFolio,
  hasFullLeadAccess,
  isSeller,
  leadVisibilityFilter,
  SELLER_ROLES,
} from './lead-access';

const ACTIVE_STATUSES = ['NUEVO', 'CONTACTADO', 'EN_CALIFICACION', 'CALIFICADO'] as const;

const listInclude = {
  owner: { select: { id: true, name: true } },
  source: { select: { id: true, name: true } },
} satisfies Prisma.LeadInclude;

type ListedLead = Prisma.LeadGetPayload<{ include: typeof listInclude }>;

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: LeadListQuery, user: AuthUser) {
    const where: Prisma.LeadWhereInput = {
      deletedAt: null,
      AND: [leadVisibilityFilter(user), this.searchFilter(query.q)],
      status: query.status,
      interestType: query.interestType,
      ownerId: query.ownerId === 'none' ? null : query.ownerId,
    };
    const [total, leads] = await this.prisma.$transaction([
      this.prisma.lead.count({ where }),
      this.prisma.lead.findMany({
        where,
        include: listInclude,
        orderBy: { receivedAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    const nextActions = await this.nextActions(leads.map((l) => l.id));
    return {
      total,
      page: query.page,
      pageSize: query.pageSize,
      items: leads.map((l) => this.toListItem(l, nextActions.get(l.id) ?? null)),
    };
  }

  async get(id: string, user: AuthUser) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, deletedAt: null, ...leadVisibilityFilter(user) },
      include: {
        ...listInclude,
        createdBy: { select: { id: true, name: true } },
        disqualificationReason: { select: { id: true, name: true } },
        productsOfInterest: true,
        statusHistory: { include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!lead) throw new NotFoundException('Lead no encontrado');
    const activities = await this.prisma.activity.findMany({
      where: { relatedType: 'lead', relatedId: id },
      include: { owner: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const next = activities
      .filter((a) => a.type === 'TAREA' && !a.completedAt && a.dueAt)
      .sort((a, b) => a.dueAt!.getTime() - b.dueAt!.getTime())[0];
    return {
      ...this.toListItem(lead, next ? { id: next.id, subject: next.subject, dueAt: next.dueAt! } : null),
      createdBy: lead.createdBy,
      disqualificationReason: lead.disqualificationReason,
      productsOfInterest: lead.productsOfInterest,
      statusHistory: lead.statusHistory,
      activities,
    };
  }

  async findDuplicates(input: DuplicateCheckInput) {
    const phone = normalizePhone(input.phone);
    const or: Prisma.LeadWhereInput[] = [];
    if (input.email) or.push({ email: input.email });
    if (phone && phone.length === 10) or.push({ phoneNormalized: phone });
    if (input.rfc) or.push({ rfc: input.rfc });
    if (input.companyName && input.companyName.length >= 3) or.push({ companyName: { contains: input.companyName } });
    if (!or.length) return [];

    const matches = await this.prisma.lead.findMany({
      where: { deletedAt: null, OR: or, id: input.excludeId ? { not: input.excludeId } : undefined },
      include: { owner: { select: { name: true } } },
      take: 10,
      orderBy: { receivedAt: 'desc' },
    });
    return matches.map((m) => ({
      id: m.id,
      folio: formatFolio(m.folioNumber),
      companyName: m.companyName,
      contactName: m.contactName,
      status: m.status,
      ownerName: m.owner?.name ?? null,
      matchedOn: [
        input.email && m.email === input.email && 'correo',
        phone && m.phoneNormalized === phone && 'teléfono',
        input.rfc && m.rfc === input.rfc && 'RFC',
        input.companyName && m.companyName.toLowerCase().includes(input.companyName.toLowerCase()) && 'empresa',
      ].filter(Boolean) as string[],
    }));
  }

  async create(input: CreateLeadInput, user: AuthUser) {
    // Sin ownerId queda a nombre de quien captura si vende (si no, sin asignar); null explícito lo deja sin asignar.
    const ownerId = input.ownerId === undefined ? (isSeller(user) ? user.id : null) : input.ownerId;
    if (ownerId !== user.id && !canAssignLeads(user)) {
      throw new ForbiddenException('Solo un gerente puede asignar leads a otra persona');
    }
    if (ownerId) await this.assertAssignable(ownerId);

    if (!input.confirmDuplicate) {
      const duplicates = await this.findDuplicates({
        email: input.email ?? undefined,
        phone: input.phone ?? input.whatsapp ?? undefined,
        rfc: input.rfc ?? undefined,
        companyName: input.companyName,
      });
      if (duplicates.length) {
        throw new ConflictException({ message: 'Hay posibles duplicados', duplicates });
      }
    }

    const receivedAt = input.receivedAt ?? new Date();
    const { productsOfInterest, confirmDuplicate: _confirm, ownerId: _owner, ...fields } = input;
    const lead = await this.prisma.$transaction(async (tx) => {
      const created = await tx.lead.create({
        data: {
          ...fields,
          receivedAt,
          ownerId,
          createdById: user.id,
          phoneNormalized: normalizePhone(input.phone ?? input.whatsapp),
          firstContactDueAt: addBusinessHours(receivedAt, FIRST_CONTACT_SLA_HOURS[input.interestType]),
          productsOfInterest: { create: productsOfInterest },
        },
      });
      await tx.leadStatusHistory.create({
        data: { leadId: created.id, toStatus: 'NUEVO', userId: user.id },
      });
      await tx.auditLog.create({
        data: { entity: 'lead', entityId: created.id, action: 'create', userId: user.id },
      });
      return created;
    });
    return this.get(lead.id, user);
  }

  async update(id: string, input: UpdateLeadInput, user: AuthUser) {
    const lead = await this.editable(id, user);
    const { productsOfInterest, ...fields } = input;
    const data: Prisma.LeadUncheckedUpdateInput = { ...fields };
    if (input.phone !== undefined || input.whatsapp !== undefined) {
      data.phoneNormalized = normalizePhone(
        (input.phone !== undefined ? input.phone : lead.phone) ??
          (input.whatsapp !== undefined ? input.whatsapp : lead.whatsapp),
      );
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.lead.update({ where: { id }, data });
      if (productsOfInterest) {
        await tx.leadProductInterest.deleteMany({ where: { leadId: id } });
        await tx.leadProductInterest.createMany({ data: productsOfInterest.map((p) => ({ ...p, leadId: id })) });
      }
      await tx.auditLog.create({
        data: { entity: 'lead', entityId: id, action: 'update', userId: user.id, changes: input as Prisma.InputJsonValue },
      });
    });
    return this.get(id, user);
  }

  async assign(id: string, ownerId: string | null, user: AuthUser) {
    const lead = await this.visible(id, user);
    this.assertNotConverted(lead);
    // Un ejecutivo solo puede tomar un lead sin responsable.
    const selfTake = !lead.ownerId && ownerId === user.id && canWriteLeads(user);
    if (!canAssignLeads(user) && !selfTake) {
      throw new ForbiddenException('Solo un gerente puede reasignar leads');
    }
    if (ownerId) await this.assertAssignable(ownerId);
    await this.prisma.$transaction([
      this.prisma.lead.update({ where: { id }, data: { ownerId } }),
      this.prisma.auditLog.create({
        data: {
          entity: 'lead',
          entityId: id,
          action: 'assign',
          userId: user.id,
          changes: { from: lead.ownerId, to: ownerId },
        },
      }),
    ]);
    return this.get(id, user);
  }

  async changeStatus(id: string, input: ChangeLeadStatusInput, user: AuthUser) {
    const lead = await this.editable(id, user);
    if (lead.status === input.status) return this.get(id, user);
    if (!canTransition(lead.status, input.status)) {
      throw new BadRequestException(`No se puede pasar de ${lead.status} a ${input.status}`);
    }
    if (input.status === 'CALIFICADO' && !lead.qualification) {
      throw new BadRequestException('Registra la calificación antes de marcar el lead como calificado');
    }
    if (input.status === 'DESCALIFICADO') {
      const reason = await this.prisma.disqualificationReason.findUnique({
        where: { id: input.disqualificationReasonId! },
      });
      if (!reason?.active) throw new BadRequestException('Motivo de descalificación inválido');
    }

    const now = new Date();
    const reactivating = lead.status === 'DESCALIFICADO';
    await this.prisma.$transaction([
      this.prisma.lead.update({
        where: { id },
        data: {
          status: input.status,
          // El primer contacto se registra la primera vez que sale de NUEVO hacia un estado activo.
          firstContactAt:
            !lead.firstContactAt && lead.status === 'NUEVO' && input.status !== 'DESCALIFICADO' ? now : undefined,
          disqualificationReasonId:
            input.status === 'DESCALIFICADO' ? input.disqualificationReasonId : reactivating ? null : undefined,
          disqualificationNotes:
            input.status === 'DESCALIFICADO' ? input.disqualificationNotes : reactivating ? null : undefined,
        },
      }),
      this.prisma.leadStatusHistory.create({
        data: {
          leadId: id,
          fromStatus: lead.status,
          toStatus: input.status,
          userId: user.id,
          comment: input.status === 'DESCALIFICADO' ? input.disqualificationNotes : input.comment,
        },
      }),
    ]);
    return this.get(id, user);
  }

  async qualify(id: string, input: Qualification, user: AuthUser) {
    await this.editable(id, user);
    await this.prisma.$transaction([
      this.prisma.lead.update({
        where: { id },
        data: { qualification: input as Prisma.InputJsonValue, score: qualificationScore(input) },
      }),
      this.prisma.auditLog.create({
        data: { entity: 'lead', entityId: id, action: 'qualify', userId: user.id, changes: input as Prisma.InputJsonValue },
      }),
    ]);
    return this.get(id, user);
  }

  async addActivity(id: string, input: CreateActivityInput, user: AuthUser) {
    await this.editable(id, user);
    return this.prisma.activity.create({
      data: {
        ...input,
        occurredAt: input.type === 'TAREA' ? null : (input.occurredAt ?? new Date()),
        ownerId: user.id,
        relatedType: 'lead',
        relatedId: id,
      },
      include: { owner: { select: { id: true, name: true } } },
    });
  }

  async completeActivity(leadId: string, activityId: string, user: AuthUser) {
    await this.editable(leadId, user);
    const activity = await this.prisma.activity.findFirst({
      where: { id: activityId, relatedType: 'lead', relatedId: leadId },
    });
    if (!activity) throw new NotFoundException('Actividad no encontrada');
    return this.prisma.activity.update({
      where: { id: activityId },
      data: { completedAt: activity.completedAt ? null : new Date() },
      include: { owner: { select: { id: true, name: true } } },
    });
  }

  async remove(id: string, user: AuthUser) {
    if (!canAssignLeads(user)) throw new ForbiddenException('Solo un gerente puede eliminar leads');
    const lead = await this.visible(id, user);
    this.assertNotConverted(lead);
    await this.prisma.$transaction([
      this.prisma.lead.update({ where: { id }, data: { deletedAt: new Date() } }),
      this.prisma.auditLog.create({ data: { entity: 'lead', entityId: id, action: 'delete', userId: user.id } }),
    ]);
  }

  async summary(user: AuthUser) {
    const base: Prisma.LeadWhereInput = { deletedAt: null, ...leadVisibilityFilter(user) };
    const now = new Date();
    const [byStatus, overdueFirstContact, unassigned] = await this.prisma.$transaction([
      this.prisma.lead.groupBy({ by: ['status'], where: base, _count: { _all: true }, orderBy: { status: 'asc' } }),
      this.prisma.lead.count({
        where: { ...base, status: 'NUEVO', firstContactAt: null, firstContactDueAt: { lt: now } },
      }),
      this.prisma.lead.count({ where: { ...base, ownerId: null, status: { in: [...ACTIVE_STATUSES] } } }),
    ]);
    return {
      byStatus: Object.fromEntries(byStatus.map((s) => [s.status, (s._count as { _all: number })._all])),
      overdueFirstContact,
      unassigned,
    };
  }

  private searchFilter(q?: string): Prisma.LeadWhereInput {
    if (!q) return {};
    const folio = /^LD-?0*(\d+)$/i.exec(q);
    const phone = normalizePhone(q);
    return {
      OR: [
        { companyName: { contains: q } },
        { contactName: { contains: q } },
        { email: { contains: q } },
        ...(phone && phone.length >= 7 ? [{ phoneNormalized: { contains: phone } }] : []),
        { rfc: { contains: q } },
        ...(folio ? [{ folioNumber: Number(folio[1]) }] : []),
      ],
    };
  }

  private async nextActions(leadIds: string[]) {
    const map = new Map<string, { id: string; subject: string; dueAt: Date }>();
    if (!leadIds.length) return map;
    const tasks = await this.prisma.activity.findMany({
      where: { relatedType: 'lead', relatedId: { in: leadIds }, type: 'TAREA', completedAt: null, dueAt: { not: null } },
      orderBy: { dueAt: 'asc' },
    });
    for (const t of tasks) {
      if (!map.has(t.relatedId)) map.set(t.relatedId, { id: t.id, subject: t.subject, dueAt: t.dueAt! });
    }
    return map;
  }

  private toListItem(lead: ListedLead, nextAction: { id: string; subject: string; dueAt: Date } | null) {
    const { phoneNormalized: _p, deletedAt: _d, ...rest } = lead;
    return {
      ...rest,
      folio: formatFolio(lead.folioNumber),
      firstContactOverdue:
        !lead.firstContactAt && !!lead.firstContactDueAt && lead.firstContactDueAt < new Date() && lead.status === 'NUEVO',
      nextAction,
    };
  }

  private async visible(id: string, user: AuthUser) {
    const lead = await this.prisma.lead.findFirst({ where: { id, deletedAt: null, ...leadVisibilityFilter(user) } });
    if (!lead) throw new NotFoundException('Lead no encontrado');
    return lead;
  }

  // Ejecutivos solo editan sus propios leads; gerentes y administradores, todos.
  private async editable(id: string, user: AuthUser) {
    const lead = await this.visible(id, user);
    if (!canWriteLeads(user)) throw new ForbiddenException('Tu rol solo permite consultar leads');
    if (!hasFullLeadAccess(user) && lead.ownerId !== user.id) {
      throw new ForbiddenException('Toma el lead o pide que te lo asignen para editarlo');
    }
    this.assertNotConverted(lead);
    return lead;
  }

  private assertNotConverted(lead: Lead) {
    if (lead.status === 'CONVERTIDO') {
      throw new BadRequestException('Un lead convertido es de solo consulta');
    }
  }

  private async assertAssignable(ownerId: string) {
    const owner = await this.prisma.user.findUnique({ where: { id: ownerId }, include: { roles: true } });
    const sells = owner?.roles.some((r) => SELLER_ROLES.includes(r.role));
    if (!owner?.active || !sells) {
      throw new BadRequestException('El responsable debe ser un ejecutivo o gerente activo');
    }
  }
}
