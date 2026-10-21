import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CLOSED_STAGES,
  formatQuoteFolio,
  STAGE_PROBABILITY,
  stageBelongsTo,
  type ChangeStageInput,
  type CreateActivityInput,
  type OpportunityListQuery,
  type UpdateOpportunityInput,
} from '@teczone/shared';
import { Prisma, type Opportunity } from '@teczone/db';
import { ActivitiesService } from '../activities/activities.service';
import type { AuthUser } from '../auth/types';
import { hasAnyRole, OPPORTUNITY_FULL_ROLES, OPPORTUNITY_WRITE_ROLES } from '../common/access';
import { PrismaService } from '../prisma/prisma.service';
import { formatOpportunityFolio } from './opportunity-format';

const listInclude = {
  account: { select: { id: true, name: true } },
  owner: { select: { id: true, name: true } },
  primaryContact: { select: { id: true, name: true } },
} satisfies Prisma.OpportunityInclude;

@Injectable()
export class OpportunitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activities: ActivitiesService,
  ) {}

  private visibility(user: AuthUser): Prisma.OpportunityWhereInput {
    return hasAnyRole(user, OPPORTUNITY_FULL_ROLES) ? {} : { ownerId: user.id };
  }

  async list(query: OpportunityListQuery, user: AuthUser) {
    const folio = query.q ? /^OP-?0*(\d+)$/i.exec(query.q) : null;
    const where: Prisma.OpportunityWhereInput = {
      deletedAt: null,
      // En AND para que el filtro ownerId de la consulta no reemplace la regla de visibilidad.
      AND: [this.visibility(user)],
      pipeline: query.pipeline,
      stage: query.stage as Opportunity['stage'] | undefined,
      ownerId: query.ownerId,
      accountId: query.accountId,
      ...(query.open === 'true' ? { closedAt: null } : query.open === 'false' ? { closedAt: { not: null } } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q } },
              { account: { name: { contains: query.q } } },
              ...(folio ? [{ folioNumber: Number(folio[1]) }] : []),
            ],
          }
        : {}),
    };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.opportunity.count({ where }),
      this.prisma.opportunity.findMany({
        where,
        include: listInclude,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    const next = await this.activities.nextActions('opportunity', items.map((o) => o.id));
    return {
      total,
      page: query.page,
      pageSize: query.pageSize,
      items: items.map((o) => ({ ...o, folio: formatOpportunityFolio(o.folioNumber), nextAction: next.get(o.id) ?? null })),
    };
  }

  async get(id: string, user: AuthUser) {
    const opp = await this.prisma.opportunity.findFirst({
      where: { id, deletedAt: null, ...this.visibility(user) },
      include: {
        ...listInclude,
        account: { include: { contacts: { where: { deletedAt: null }, orderBy: { name: 'asc' } } } },
        stageHistory: { include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } },
        sourceLeads: { select: { id: true, folioNumber: true } },
        quotes: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          include: {
            versions: { orderBy: { number: 'desc' }, take: 1, select: { number: true, currency: true, subtotal: true, total: true, totalCost: true, marginPct: true } },
          },
        },
      },
    });
    if (!opp) throw new NotFoundException('Oportunidad no encontrada');
    const activities = await this.activities.list('opportunity', id);
    const next = activities
      .filter((a) => a.type === 'TAREA' && !a.completedAt && a.dueAt)
      .sort((a, b) => a.dueAt!.getTime() - b.dueAt!.getTime())[0];
    return {
      ...opp,
      folio: formatOpportunityFolio(opp.folioNumber),
      sourceLeads: opp.sourceLeads.map((l) => ({ id: l.id, folio: `LD-${String(l.folioNumber).padStart(6, '0')}` })),
      quotes: opp.quotes.map(({ versions, ...q }) => ({ ...q, folio: formatQuoteFolio(q.folioNumber), version: versions[0] })),
      activities,
      nextAction: next ? { id: next.id, subject: next.subject, dueAt: next.dueAt } : null,
    };
  }

  async update(id: string, input: UpdateOpportunityInput, user: AuthUser) {
    const opp = await this.editable(id, user);
    if (input.primaryContactId) {
      const contact = await this.prisma.contact.findFirst({
        where: { id: input.primaryContactId, accountId: opp.accountId, deletedAt: null },
      });
      if (!contact) throw new BadRequestException('El contacto no pertenece a la cuenta');
    }
    await this.prisma.$transaction([
      this.prisma.opportunity.update({ where: { id }, data: input }),
      this.prisma.auditLog.create({
        data: { entity: 'opportunity', entityId: id, action: 'update', userId: user.id, changes: input as Prisma.InputJsonValue },
      }),
    ]);
    return this.get(id, user);
  }

  async changeStage(id: string, input: ChangeStageInput, user: AuthUser) {
    const opp = await this.editable(id, user);
    if (!stageBelongsTo(opp.pipeline, input.stage)) {
      throw new BadRequestException('La etapa no corresponde al pipeline de la oportunidad');
    }
    if (opp.stage === input.stage) return this.get(id, user);
    const closing = CLOSED_STAGES.includes(input.stage);
    // Reabrir una oportunidad cerrada queda en manos de gerencia.
    if (opp.closedAt && !closing && !hasAnyRole(user, ['ADMIN', 'GERENTE_COMERCIAL'])) {
      throw new ForbiddenException('Solo un gerente puede reabrir una oportunidad cerrada');
    }
    await this.prisma.$transaction([
      this.prisma.opportunity.update({
        where: { id },
        data: {
          stage: input.stage,
          probability: STAGE_PROBABILITY[input.stage],
          closedAt: closing ? new Date() : null,
          lostReason: input.stage === 'PERDIDA' ? input.lostReason : null,
        },
      }),
      this.prisma.opportunityStageHistory.create({
        data: {
          opportunityId: id,
          fromStage: opp.stage,
          toStage: input.stage,
          userId: user.id,
          comment: input.stage === 'PERDIDA' ? input.lostReason : input.comment,
        },
      }),
    ]);
    return this.get(id, user);
  }

  async addActivity(id: string, input: CreateActivityInput, user: AuthUser) {
    await this.editable(id, user);
    return this.activities.add('opportunity', id, input, user);
  }

  async toggleActivity(id: string, activityId: string, user: AuthUser) {
    await this.editable(id, user);
    return this.activities.toggle('opportunity', id, activityId);
  }

  private async editable(id: string, user: AuthUser) {
    const opp = await this.prisma.opportunity.findFirst({ where: { id, deletedAt: null, ...this.visibility(user) } });
    if (!opp) throw new NotFoundException('Oportunidad no encontrada');
    const manager = hasAnyRole(user, ['ADMIN', 'GERENTE_COMERCIAL']);
    if (!hasAnyRole(user, OPPORTUNITY_WRITE_ROLES) || (!manager && opp.ownerId !== user.id)) {
      throw new ForbiddenException('Solo el responsable o un gerente puede modificar la oportunidad');
    }
    return opp;
  }
}
