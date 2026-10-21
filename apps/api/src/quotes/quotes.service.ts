import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ACTIVE_QUOTE_STATUSES,
  addDays,
  computeLine,
  computeQuoteTotals,
  formatQuoteFolio,
  LOST_QUOTE_STATUS,
  mxPeriodStarts,
  QUOTE_STATUS_LABELS,
  REVISABLE_QUOTE_STATUSES,
  SENT_QUOTE_STATUSES,
  STAGE_PROBABILITY,
  summarizeQuoteResults,
  todayMx,
  WON_QUOTE_STATUS,
  type CreateActivityInput,
  type CreateQuoteInput,
  type QuoteDraftInput,
  type QuoteListQuery,
  type QuoteOutcomeInput,
  type QuoteStatus,
  type SendQuoteInput,
} from '@teczone/shared';
import { Prisma, type Quote } from '@teczone/db';
import { ActivitiesService } from '../activities/activities.service';
import type { AuthUser } from '../auth/types';
import { hasAnyRole, QUOTE_APPROVER_ROLES, QUOTE_FULL_ROLES, QUOTE_WRITE_ROLES } from '../common/access';
import { formatOpportunityFolio } from '../opportunities/opportunity-format';
import { renderQuotePdf } from './quote-pdf';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';

type Tx = Prisma.TransactionClient;

const userRef = { select: { id: true, name: true } } as const;

const CHANNEL_ACTIVITY = { CORREO: 'CORREO', WHATSAPP: 'WHATSAPP', REUNION: 'REUNION', OTRO: 'NOTA' } as const;

// Cotizaciones con versiones, margen y autorización (FR-03 a FR-11, RN-05).
@Injectable()
export class QuotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activities: ActivitiesService,
    private readonly settings: SettingsService,
  ) {}

  private visibility(user: AuthUser): Prisma.QuoteWhereInput {
    return hasAnyRole(user, QUOTE_FULL_ROLES) ? {} : { ownerId: user.id };
  }

  // Las enviadas cuya versión vigente pasó su vigencia quedan vencidas.
  async expireStale() {
    const stale = await this.prisma.quote.findMany({
      where: {
        deletedAt: null,
        status: { in: [...SENT_QUOTE_STATUSES] },
        versions: { some: { validUntil: { lt: todayMx() } } },
      },
      include: { versions: { orderBy: { number: 'desc' }, take: 1 } },
    });
    for (const q of stale) {
      const current = q.versions[0];
      if (!current || current.validUntil >= todayMx()) continue;
      await this.prisma.$transaction([
        this.prisma.quote.update({ where: { id: q.id }, data: { status: 'VENCIDA' } }),
        this.prisma.quoteStatusHistory.create({
          data: {
            quoteId: q.id,
            fromStatus: q.status,
            toStatus: 'VENCIDA',
            versionNumber: current.number,
            comment: 'Venció la vigencia de la versión enviada',
          },
        }),
      ]);
    }
  }

  async list(query: QuoteListQuery, user: AuthUser) {
    await this.expireStale();
    const folio = query.q ? /^COT-?0*(\d+)/i.exec(query.q) : null;
    const where: Prisma.QuoteWhereInput = {
      deletedAt: null,
      AND: [this.visibility(user)],
      status:
        query.status ??
        (query.active === 'true'
          ? { in: [...ACTIVE_QUOTE_STATUSES] }
          : query.active === 'false'
            ? { notIn: [...ACTIVE_QUOTE_STATUSES] }
            : undefined),
      opportunityId: query.opportunityId,
      ownerId: query.ownerId,
      ...(query.q
        ? {
            OR: [
              { opportunity: { name: { contains: query.q } } },
              { opportunity: { account: { name: { contains: query.q } } } },
              ...(folio ? [{ folioNumber: Number(folio[1]) }] : []),
            ],
          }
        : {}),
    };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.quote.count({ where }),
      this.prisma.quote.findMany({
        where,
        include: {
          owner: userRef,
          opportunity: { select: { id: true, name: true, account: { select: { id: true, name: true } } } },
          versions: {
            orderBy: { number: 'desc' },
            take: 1,
            select: { number: true, currency: true, total: true, marginPct: true, validUntil: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    const next = await this.activities.nextActions(
      'quote',
      items.map((q) => q.id),
    );
    return {
      total,
      page: query.page,
      pageSize: query.pageSize,
      items: items.map(({ versions, ...q }) => ({
        ...q,
        folio: formatQuoteFolio(q.folioNumber),
        version: versions[0],
        nextAction: next.get(q.id) ?? null,
      })),
    };
  }

  async summary(user: AuthUser) {
    const { yearStart, nextYearStart } = mxPeriodStarts();
    const quotes = await this.prisma.quote.findMany({
      where: {
        deletedAt: null,
        ...this.visibility(user),
        status: { in: [WON_QUOTE_STATUS, LOST_QUOTE_STATUS] },
        closedAt: { gte: yearStart, lt: nextYearStart },
      },
      select: {
        status: true,
        closedAt: true,
        versions: {
          orderBy: { number: 'desc' },
          take: 1,
          select: { currency: true, exchangeRate: true, subtotal: true },
        },
      },
    });
    return summarizeQuoteResults(
      quotes.flatMap(({ status, closedAt, versions: [v] }) =>
        v && closedAt
          ? [{ status, closedAt, currency: v.currency, exchangeRate: Number(v.exchangeRate), subtotal: Number(v.subtotal) }]
          : [],
      ),
    );
  }

  async get(id: string, user: AuthUser) {
    await this.expireStale();
    const quote = await this.prisma.quote.findFirst({
      where: { id, deletedAt: null, ...this.visibility(user) },
      include: {
        owner: userRef,
        contact: true,
        opportunity: {
          include: {
            account: { include: { contacts: { where: { deletedAt: null }, orderBy: { name: 'asc' } } } },
          },
        },
        versions: {
          orderBy: { number: 'desc' },
          include: { items: { orderBy: { position: 'asc' } }, createdBy: userRef, approvedBy: userRef },
        },
        statusHistory: { include: { user: userRef }, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!quote) throw new NotFoundException('Cotización no encontrada');
    const activities = await this.activities.list('quote', id);
    const next = activities
      .filter((a) => a.type === 'TAREA' && !a.completedAt && a.dueAt)
      .sort((a, b) => a.dueAt!.getTime() - b.dueAt!.getTime())[0];
    return {
      ...quote,
      folio: formatQuoteFolio(quote.folioNumber),
      opportunity: { ...quote.opportunity, folio: formatOpportunityFolio(quote.opportunity.folioNumber) },
      activities,
      nextAction: next ? { id: next.id, subject: next.subject, dueAt: next.dueAt } : null,
    };
  }

  async create(input: CreateQuoteInput, user: AuthUser) {
    const opp = await this.prisma.opportunity.findFirst({
      where: {
        id: input.opportunityId,
        deletedAt: null,
        ...(hasAnyRole(user, QUOTE_FULL_ROLES) ? {} : { ownerId: user.id }),
      },
    });
    if (!opp) throw new NotFoundException('Oportunidad no encontrada');
    if (!hasAnyRole(user, QUOTE_APPROVER_ROLES) && opp.ownerId !== user.id) {
      throw new ForbiddenException('Solo el responsable de la oportunidad o un gerente puede cotizar');
    }
    if (opp.closedAt) throw new BadRequestException('La oportunidad está cerrada');
    const s = await this.settings.quoteSettings();
    const currency = opp.currency ?? 'MXN';
    const quote = await this.prisma.$transaction(async (tx) => {
      const q = await tx.quote.create({
        data: {
          opportunityId: opp.id,
          contactId: opp.primaryContactId,
          ownerId: opp.ownerId,
          createdById: user.id,
          versions: {
            create: {
              number: 1,
              currency,
              exchangeRate: s.usdExchangeRate,
              taxRate: s.taxRate,
              minMarginPct: s.minMarginPct,
              validUntil: addDays(todayMx(), s.validityDays),
              terms: s.terms || null,
              createdById: user.id,
            },
          },
        },
      });
      await tx.quoteStatusHistory.create({
        data: { quoteId: q.id, toStatus: 'BORRADOR', versionNumber: 1, userId: user.id },
      });
      return q;
    });
    return this.get(quote.id, user);
  }

  async saveDraft(id: string, input: QuoteDraftInput, user: AuthUser) {
    const quote = await this.editable(id, user);
    if (quote.status !== 'BORRADOR') {
      throw new BadRequestException('Solo se edita un borrador. Crea una versión nueva para cambiar la cotización.');
    }
    if (input.contactId) await this.assertContact(quote.opportunityId, input.contactId);
    const version = await this.currentVersion(quote);
    const totals = computeQuoteTotals(input.items, Number(version.taxRate));
    await this.prisma.$transaction([
      this.prisma.quoteItem.deleteMany({ where: { versionId: version.id } }),
      this.prisma.quoteVersion.update({
        where: { id: version.id },
        data: {
          currency: input.currency,
          exchangeRate: input.exchangeRate,
          validUntil: input.validUntil,
          terms: input.terms,
          notes: input.notes,
          ...totals,
          items: {
            create: input.items.map((item, position) => ({ ...item, position, ...computeLine(item) })),
          },
        },
      }),
      this.prisma.quote.update({ where: { id }, data: { contactId: input.contactId ?? null } }),
    ]);
    return this.get(id, user);
  }

  // Margen bajo el mínimo pasa a autorización; si no, queda autorizada (FR-05).
  async submit(id: string, user: AuthUser) {
    const quote = await this.editable(id, user);
    this.assertStatus(quote, ['BORRADOR']);
    const version = await this.currentVersion(quote, true);
    if (!version.items.length) throw new BadRequestException('Agrega al menos una partida');
    if (version.validUntil < todayMx()) throw new BadRequestException('La vigencia ya pasó; actualízala');
    const margin = Number(version.marginPct);
    const min = Number(version.minMarginPct);
    const needsApproval = margin < min;
    await this.transition(quote, needsApproval ? 'PENDIENTE_APROBACION' : 'AUTORIZADA', user, {
      comment: needsApproval
        ? `Margen ${margin}% por debajo del mínimo de ${min}%`
        : `Margen ${margin}% dentro del mínimo de ${min}%`,
    });
    return this.get(id, user);
  }

  async approve(id: string, comment: string | null, user: AuthUser) {
    const quote = await this.visible(id, user);
    this.assertStatus(quote, ['PENDIENTE_APROBACION']);
    const version = await this.currentVersion(quote);
    await this.transition(quote, 'AUTORIZADA', user, {
      comment,
      extra: [
        this.prisma.quoteVersion.update({
          where: { id: version.id },
          data: { approvedById: user.id, approvedAt: new Date(), approvalComment: comment },
        }),
      ],
    });
    return this.get(id, user);
  }

  async rejectApproval(id: string, comment: string, user: AuthUser) {
    const quote = await this.visible(id, user);
    this.assertStatus(quote, ['PENDIENTE_APROBACION']);
    await this.transition(quote, 'BORRADOR', user, { comment: `Autorización rechazada: ${comment}` });
    return this.get(id, user);
  }

  async send(id: string, input: SendQuoteInput, user: AuthUser) {
    const quote = await this.editable(id, user);
    this.assertStatus(quote, ['AUTORIZADA']);
    if (input.followUp.dueAt <= new Date()) throw new BadRequestException('El seguimiento debe ser en el futuro');
    const version = await this.currentVersion(quote);
    const folio = formatQuoteFolio(quote.folioNumber, version.number);
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.quoteVersion.update({ where: { id: version.id }, data: { issuedAt: now } });
      await tx.quote.update({ where: { id }, data: { sentAt: quote.sentAt ?? now } });
      await this.writeTransition(tx, quote, 'ENVIADA', user, input.comment);
      await tx.activity.createMany({
        data: [
          {
            type: CHANNEL_ACTIVITY[input.channel],
            subject: `Cotización ${folio} enviada`,
            description: input.comment,
            occurredAt: now,
            ownerId: user.id,
            relatedType: 'quote',
            relatedId: id,
          },
          {
            type: 'TAREA',
            subject: input.followUp.subject,
            dueAt: input.followUp.dueAt,
            ownerId: user.id,
            relatedType: 'quote',
            relatedId: id,
          },
        ],
      });
      // En PyME la oportunidad avanza a "Cotización enviada" (FR-02).
      const opp = await tx.opportunity.findUniqueOrThrow({ where: { id: quote.opportunityId } });
      if (opp.pipeline === 'PYME' && (opp.stage === 'SOLICITUD' || opp.stage === 'COSTEO_MARGEN')) {
        await this.moveOpportunity(tx, opp.id, opp.stage, 'COTIZACION_ENVIADA', user, `Se envió ${folio}`);
      }
    });
    return this.get(id, user);
  }

  async outcome(id: string, input: QuoteOutcomeInput, user: AuthUser) {
    const quote = await this.editable(id, user);
    const allowed: Record<QuoteOutcomeInput['status'], QuoteStatus[]> = {
      EN_NEGOCIACION: ['ENVIADA'],
      ACEPTADA: ['ENVIADA', 'EN_NEGOCIACION'],
      RECHAZADA: ['ENVIADA', 'EN_NEGOCIACION', 'VENCIDA'],
    };
    this.assertStatus(quote, allowed[input.status]);
    const closing = input.status !== 'EN_NEGOCIACION';
    const version = await this.currentVersion(quote);
    await this.prisma.$transaction(async (tx) => {
      await tx.quote.update({
        where: { id },
        data: {
          closedAt: closing ? new Date() : null,
          rejectedReason: input.status === 'RECHAZADA' ? input.comment : null,
        },
      });
      await this.writeTransition(tx, quote, input.status, user, input.comment);
      if (closing) {
        // Sin cotización activa no quedan seguimientos pendientes.
        await tx.activity.updateMany({
          where: { relatedType: 'quote', relatedId: id, type: 'TAREA', completedAt: null },
          data: { completedAt: new Date() },
        });
      }
      if (input.status === 'ACEPTADA' && input.winOpportunity) {
        const opp = await tx.opportunity.findUniqueOrThrow({ where: { id: quote.opportunityId } });
        if (!opp.closedAt) {
          await this.moveOpportunity(
            tx,
            opp.id,
            opp.stage,
            'GANADA',
            user,
            `Cotización ${formatQuoteFolio(quote.folioNumber, version.number)} aceptada`,
            { amount: version.subtotal, currency: version.currency },
          );
        }
      }
    });
    return this.get(id, user);
  }

  // Copia la versión vigente en un borrador nuevo; la anterior queda sustituida (FR-07).
  async newVersion(id: string, user: AuthUser) {
    const quote = await this.editable(id, user);
    this.assertStatus(quote, [...REVISABLE_QUOTE_STATUSES]);
    const version = await this.currentVersion(quote, true);
    const s = await this.settings.quoteSettings();
    const number = version.number + 1;
    await this.prisma.$transaction(async (tx) => {
      await tx.quoteVersion.create({
        data: {
          quoteId: id,
          number,
          currency: version.currency,
          exchangeRate: version.exchangeRate,
          taxRate: s.taxRate,
          minMarginPct: s.minMarginPct,
          validUntil: addDays(todayMx(), s.validityDays),
          terms: version.terms,
          notes: version.notes,
          createdById: user.id,
          ...computeQuoteTotals(
            version.items.map((i) => ({
              quantity: Number(i.quantity),
              unitCost: Number(i.unitCost),
              unitPrice: Number(i.unitPrice),
              discountPct: Number(i.discountPct),
            })),
            s.taxRate,
          ),
          items: {
            create: version.items.map(({ id: _id, versionId: _v, ...item }) => item),
          },
        },
      });
      await tx.quote.update({
        where: { id },
        data: { currentVersion: number, status: 'BORRADOR', closedAt: null, rejectedReason: null },
      });
      await tx.quoteStatusHistory.create({
        data: {
          quoteId: id,
          fromStatus: quote.status,
          toStatus: 'BORRADOR',
          versionNumber: number,
          userId: user.id,
          comment: `Versión ${number} creada; la versión ${version.number} queda sustituida`,
        },
      });
    });
    return this.get(id, user);
  }

  async addActivity(id: string, input: CreateActivityInput, user: AuthUser) {
    await this.editable(id, user);
    return this.activities.add('quote', id, input, user);
  }

  async toggleActivity(id: string, activityId: string, user: AuthUser) {
    await this.editable(id, user);
    return this.activities.toggle('quote', id, activityId);
  }

  // PDF de una versión (la vigente por omisión), sin costos ni margen (FR-06).
  async pdf(id: string, versionNumber: number | undefined, user: AuthUser) {
    const quote = await this.prisma.quote.findFirst({
      where: { id, deletedAt: null, ...this.visibility(user) },
      include: {
        owner: { select: { name: true, email: true } },
        contact: true,
        opportunity: { include: { account: true } },
        versions: {
          where: { number: versionNumber ?? undefined },
          orderBy: { number: 'desc' },
          take: 1,
          include: { items: { orderBy: { position: 'asc' } } },
        },
      },
    });
    if (!quote) throw new NotFoundException('Cotización no encontrada');
    const version = quote.versions[0];
    if (!version) throw new NotFoundException('Versión no encontrada');
    // Solo lo enviado o lo autorizado listo para enviar sale sin marca de agua.
    const ready = !!version.issuedAt || (version.number === quote.currentVersion && quote.status === 'AUTORIZADA');
    const account = quote.opportunity.account;
    const filename = `${formatQuoteFolio(quote.folioNumber)}-v${version.number}.pdf`;
    const buffer = await renderQuotePdf({
      folio: formatQuoteFolio(quote.folioNumber, version.number),
      draft: !ready,
      date: version.issuedAt ?? version.approvedAt ?? version.updatedAt,
      validUntil: version.validUntil,
      currency: version.currency,
      exchangeRate: Number(version.exchangeRate),
      taxRate: Number(version.taxRate),
      subtotal: Number(version.subtotal),
      tax: Number(version.tax),
      total: Number(version.total),
      terms: version.terms,
      notes: version.notes,
      company: await this.settings.companySettings(),
      client: { name: account.name, legalName: account.legalName, rfc: account.rfc, city: account.city },
      contact: quote.contact,
      seller: quote.owner,
      items: version.items.map((i) => ({
        sku: i.sku,
        description: i.description,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        discountPct: Number(i.discountPct),
        lineTotal: Number(i.lineTotal),
      })),
    });
    return { filename, buffer };
  }

  // ---------- Apoyo ----------

  private async visible(id: string, user: AuthUser) {
    const quote = await this.prisma.quote.findFirst({ where: { id, deletedAt: null, ...this.visibility(user) } });
    if (!quote) throw new NotFoundException('Cotización no encontrada');
    return quote;
  }

  private async editable(id: string, user: AuthUser) {
    const quote = await this.visible(id, user);
    const manager = hasAnyRole(user, QUOTE_APPROVER_ROLES);
    if (!hasAnyRole(user, QUOTE_WRITE_ROLES) || (!manager && quote.ownerId !== user.id)) {
      throw new ForbiddenException('Solo el responsable o un gerente puede modificar la cotización');
    }
    return quote;
  }

  private assertStatus(quote: Quote, allowed: readonly QuoteStatus[]) {
    if (!allowed.includes(quote.status)) {
      throw new BadRequestException(
        `No se puede hacer esto con una cotización en estado "${QUOTE_STATUS_LABELS[quote.status]}"`,
      );
    }
  }

  private async currentVersion(quote: Quote, withItems = false) {
    return this.prisma.quoteVersion.findUniqueOrThrow({
      where: { quoteId_number: { quoteId: quote.id, number: quote.currentVersion } },
      include: { items: withItems ? { orderBy: { position: 'asc' } } : false },
    });
  }

  private async assertContact(opportunityId: string, contactId: string) {
    const opp = await this.prisma.opportunity.findUniqueOrThrow({ where: { id: opportunityId } });
    const contact = await this.prisma.contact.findFirst({ where: { id: contactId, accountId: opp.accountId, deletedAt: null } });
    if (!contact) throw new BadRequestException('El contacto no pertenece a la cuenta');
  }

  private async transition(
    quote: Quote,
    to: QuoteStatus,
    user: AuthUser,
    opts: { comment?: string | null; extra?: Prisma.PrismaPromise<unknown>[] } = {},
  ) {
    await this.prisma.$transaction([
      this.prisma.quote.update({ where: { id: quote.id }, data: { status: to } }),
      this.prisma.quoteStatusHistory.create({
        data: {
          quoteId: quote.id,
          fromStatus: quote.status,
          toStatus: to,
          versionNumber: quote.currentVersion,
          userId: user.id,
          comment: opts.comment ?? null,
        },
      }),
      ...(opts.extra ?? []),
    ]);
  }

  private async writeTransition(tx: Tx, quote: Quote, to: QuoteStatus, user: AuthUser, comment: string | null) {
    await tx.quote.update({ where: { id: quote.id }, data: { status: to } });
    await tx.quoteStatusHistory.create({
      data: {
        quoteId: quote.id,
        fromStatus: quote.status,
        toStatus: to,
        versionNumber: quote.currentVersion,
        userId: user.id,
        comment,
      },
    });
  }

  private async moveOpportunity(
    tx: Tx,
    opportunityId: string,
    from: Prisma.OpportunityStageHistoryCreateManyInput['toStage'],
    to: 'COTIZACION_ENVIADA' | 'GANADA',
    user: AuthUser,
    comment: string,
    extra: Prisma.OpportunityUpdateInput = {},
  ) {
    await tx.opportunity.update({
      where: { id: opportunityId },
      data: { stage: to, probability: STAGE_PROBABILITY[to], ...(to === 'GANADA' ? { closedAt: new Date() } : {}), ...extra },
    });
    await tx.opportunityStageHistory.create({
      data: { opportunityId, fromStage: from, toStage: to, userId: user.id, comment },
    });
  }
}
