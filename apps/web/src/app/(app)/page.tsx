'use client';

import { STAGE_LABELS, type LeadStatus, type OpportunityStage, type PeriodTotals, type QuoteResultsSummary } from '@teczone/shared';
import {
  AlarmClock,
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  FileText,
  Plus,
  Target,
  Trophy,
  UserPlus,
  Wallet,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { StatusBadge } from '@/components/lead-badges';
import { ButtonLink, Card, EmptyState, ErrorText, StatCard } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import type { OpportunityListItem } from '@/lib/crm';
import { formatDateTime, formatDay, formatMoney } from '@/lib/format';
import type { LeadListItem } from '@/lib/leads';
import { canApproveQuotes, canSeeLeads, canSeeOpportunities, canSeeQuotes, canWriteLeads } from '@/lib/permissions';
import { useSession } from '@/lib/session';

interface List<T> {
  total: number;
  items: T[];
}

interface Dashboard {
  leadSummary?: { byStatus: Partial<Record<LeadStatus, number>>; overdueFirstContact: number; unassigned: number };
  recentLeads?: LeadListItem[];
  opportunities?: List<OpportunityListItem>;
  quotesActive?: number;
  quotesPending?: number;
  quoteResults?: QuoteResultsSummary;
}

const ACTIVE_STATUSES: LeadStatus[] = ['NUEVO', 'CONTACTADO', 'EN_CALIFICACION', 'CALIFICADO'];

function greeting() {
  const h = Number(
    new Intl.DateTimeFormat('es-MX', { hour: 'numeric', hourCycle: 'h23', timeZone: 'America/Mexico_City' }).format(new Date()),
  );
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
}

export default function HomePage() {
  const user = useSession();
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Cada bloque solo se pide si el rol puede verlo; la API vuelve a validar el acceso.
    const leads = canSeeLeads(user);
    const opps = canSeeOpportunities(user);
    const quotes = canSeeQuotes(user);
    Promise.all([
      leads ? api<Dashboard['leadSummary']>('/leads/summary') : undefined,
      leads ? api<List<LeadListItem>>('/leads?pageSize=5') : undefined,
      opps ? api<List<OpportunityListItem>>('/opportunities?open=true&pageSize=200') : undefined,
      quotes ? api<List<unknown>>('/quotes?active=true&pageSize=1') : undefined,
      quotes ? api<List<unknown>>('/quotes?status=PENDIENTE_APROBACION&pageSize=1') : undefined,
      quotes ? api<QuoteResultsSummary>('/quotes/summary') : undefined,
    ])
      .then(([leadSummary, recent, opportunities, active, pending, quoteResults]) =>
        setData({
          leadSummary,
          recentLeads: recent?.items,
          opportunities,
          quotesActive: active?.total,
          quotesPending: pending?.total,
          quoteResults,
        }),
      )
      .catch((e) => setError(e instanceof ApiError ? e.message : 'No se pudo cargar el resumen'));
  }, [user]);

  const firstName = user?.name.split(' ')[0];
  const statCount = (canSeeLeads(user) ? 2 : 0) + (canSeeOpportunities(user) ? 1 : 0) + (canSeeQuotes(user) ? 3 : 0);
  const activeLeads = ACTIVE_STATUSES.reduce((n, s) => n + (data?.leadSummary?.byStatus[s] ?? 0), 0);
  const opps = data?.opportunities?.items ?? [];
  const pipelineMxn = opps.filter((o) => (o.currency ?? 'MXN') === 'MXN').reduce((n, o) => n + Number(o.amount ?? 0), 0);
  const pipelineUsd = opps.filter((o) => o.currency === 'USD').reduce((n, o) => n + Number(o.amount ?? 0), 0);
  const overdueActions = opps.filter((o) => o.nextAction && new Date(o.nextAction.dueAt) < new Date()).length;
  const upcoming = [...opps]
    .filter((o) => o.expectedCloseDate)
    .sort((a, b) => a.expectedCloseDate!.localeCompare(b.expectedCloseDate!))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-950 via-brand-900 to-brand-700 px-6 py-7 text-white shadow-card sm:px-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 -right-16 size-72 rounded-full bg-[radial-gradient(circle,rgba(95,142,246,0.45),transparent_65%)]"
        />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-brand-200">{greeting()},</p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{firstName}</h1>
            <p className="mt-1 text-sm text-slate-300">Este es el resumen de tu actividad comercial.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canWriteLeads(user) && (
              <Link
                href="/leads/nuevo"
                className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-sm font-medium text-brand-900 shadow-sm transition hover:bg-brand-50"
              >
                <Plus className="size-4" /> Nuevo lead
              </Link>
            )}
            {canSeeOpportunities(user) && (
              <Link
                href="/oportunidades"
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3.5 py-2 text-sm font-medium text-white ring-1 ring-white/20 transition hover:bg-white/15"
              >
                Ver oportunidades <ArrowRight className="size-4" />
              </Link>
            )}
          </div>
        </div>
      </div>

      <ErrorText>{error}</ErrorText>

      {/* Fila 1: pendientes de atención (conteos). Fila 2: montos. Con 6 tarjetas queda en 3x2. */}
      <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${statCount === 4 ? 'xl:grid-cols-4' : 'xl:grid-cols-3'}`}>
        {canSeeLeads(user) && (
          <StatCard
            label="Leads activos"
            value={data ? activeLeads : '…'}
            icon={UserPlus}
            href="/leads"
            hint={data?.leadSummary?.unassigned ? `${data.leadSummary.unassigned} sin responsable` : 'Todos con responsable'}
          />
        )}
        {canSeeLeads(user) && (
          <StatCard
            label="Primer contacto vencido"
            value={data ? (data.leadSummary?.overdueFirstContact ?? 0) : '…'}
            icon={AlarmClock}
            tone={data?.leadSummary?.overdueFirstContact ? 'alert' : 'good'}
            href="/leads"
            hint={data?.leadSummary?.overdueFirstContact ? 'Requieren atención hoy' : 'Al día'}
          />
        )}
        {canSeeQuotes(user) && (
          <StatCard
            label={canApproveQuotes(user) ? 'Por autorizar' : 'Cotizaciones activas'}
            value={data ? ((canApproveQuotes(user) ? data.quotesPending : data.quotesActive) ?? 0) : '…'}
            icon={canApproveQuotes(user) ? BadgeCheck : FileText}
            tone={canApproveQuotes(user) && data?.quotesPending ? 'warn' : 'brand'}
            href="/cotizaciones"
            hint={canApproveQuotes(user) ? `${data?.quotesActive ?? 0} cotizaciones activas` : undefined}
          />
        )}
        {canSeeOpportunities(user) && (
          <StatCard
            label="Pipeline abierto"
            value={data ? formatMoney(pipelineMxn, 'MXN') : '…'}
            icon={Wallet}
            tone="good"
            href="/oportunidades"
            hint={
              data
                ? `${data.opportunities?.total ?? 0} oportunidades${pipelineUsd ? ` · ${formatMoney(pipelineUsd, 'USD')}` : ''}`
                : undefined
            }
          />
        )}
        {canSeeQuotes(user) && (
          <StatCard
            label="Ventas ganadas"
            value={data ? <PeriodSplit summary={data.quoteResults} pick="won" /> : '…'}
            icon={Trophy}
            tone="good"
            href="/cotizaciones"
            hint="Cotizaciones aceptadas, sin IVA, en MXN"
          />
        )}
        {canSeeQuotes(user) && (
          <StatCard
            label="Ventas perdidas"
            value={data ? <PeriodSplit summary={data.quoteResults} pick="lost" /> : '…'}
            icon={XCircle}
            tone="neutral"
            href="/cotizaciones"
            hint="Cotizaciones rechazadas, sin IVA, en MXN"
          />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {canSeeOpportunities(user) && (
          <Card title="Pipeline por etapa" className="lg:col-span-3" actions={<SeeAll href="/oportunidades" />}>
            {data ? <StageBars items={opps} /> : <BarsSkeleton />}
            {overdueActions > 0 && (
              <p className="mt-4 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <CalendarClock className="size-4" aria-hidden />
                {overdueActions === 1 ? '1 oportunidad tiene' : `${overdueActions} oportunidades tienen`} la próxima acción vencida.
              </p>
            )}
          </Card>
        )}
        {canSeeOpportunities(user) && (
          <Card title="Próximos cierres" className="lg:col-span-2">
            {!data ? (
              <BarsSkeleton />
            ) : upcoming.length ? (
              <ul className="-my-2 divide-y divide-slate-100">
                {upcoming.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <Link href={`/oportunidades/${o.id}`} className="block truncate text-sm font-medium hover:text-brand">
                        {o.name}
                      </Link>
                      <div className="truncate text-xs text-slate-500">{o.account.name}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-sm font-medium tabular-nums">{formatMoney(o.amount, o.currency)}</div>
                      <div className="text-xs text-slate-500">{formatDay(o.expectedCloseDate)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-slate-500">Sin fechas de cierre estimadas.</p>
            )}
          </Card>
        )}
      </div>

      {canSeeLeads(user) && (
        <Card title="Leads recientes" actions={<SeeAll href="/leads" />}>
          {!data ? (
            <BarsSkeleton />
          ) : data.recentLeads?.length ? (
            <ul className="-my-2 divide-y divide-slate-100">
              {data.recentLeads.map((l) => (
                <li key={l.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5">
                  <span className="w-24 font-mono text-xs text-slate-500">{l.folio}</span>
                  <div className="min-w-0 flex-1">
                    <Link href={`/leads/${l.id}`} className="text-sm font-medium hover:text-brand">
                      {l.companyName}
                    </Link>
                    <span className="text-sm text-slate-500"> · {l.contactName}</span>
                  </div>
                  <StatusBadge status={l.status} />
                  <span className="w-36 text-right text-xs text-slate-500">{formatDateTime(l.receivedAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Aún no hay leads" icon={UserPlus}>
              Registra el primero para empezar a dar seguimiento.
            </EmptyState>
          )}
        </Card>
      )}

      {!canSeeLeads(user) && !canSeeOpportunities(user) && (
        <EmptyState title="Te damos la bienvenida al CRM de TecZone" icon={Target}>
          Usa el menú lateral para entrar a los módulos de tu rol.
        </EmptyState>
      )}
    </div>
  );
}

function SeeAll({ href }: { href: string }) {
  return (
    <ButtonLink href={href} variant="ghost" className="-my-1 px-2 py-1">
      Ver todo <ArrowRight className="size-4" />
    </ButtonLink>
  );
}

// Monto abierto por etapa en barras horizontales (una sola serie, un solo tono).
function StageBars({ items }: { items: OpportunityListItem[] }) {
  const byStage = new Map<OpportunityStage, { count: number; amount: number }>();
  for (const o of items) {
    const row = byStage.get(o.stage) ?? { count: 0, amount: 0 };
    row.count += 1;
    if ((o.currency ?? 'MXN') === 'MXN') row.amount += Number(o.amount ?? 0);
    byStage.set(o.stage, row);
  }
  const rows = [...byStage.entries()].sort((a, b) => b[1].amount - a[1].amount);
  const max = Math.max(1, ...rows.map(([, r]) => r.amount));
  if (!rows.length) {
    return (
      <p className="py-6 text-center text-sm text-slate-500">No hay oportunidades abiertas. Se crean al convertir un lead calificado.</p>
    );
  }
  return (
    <ul className="space-y-3">
      {rows.map(([stage, r]) => (
        <li key={stage} className="group" title={`${STAGE_LABELS[stage]}: ${r.count} · ${formatMoney(r.amount, 'MXN')}`}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="text-slate-700">
              {STAGE_LABELS[stage]} <span className="text-xs text-slate-400">({r.count})</span>
            </span>
            <span className="font-medium tabular-nums text-slate-900">{formatMoney(r.amount, 'MXN')}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-brand-500 transition-[width] group-hover:bg-brand-600"
              style={{ width: `${Math.max(2, (r.amount / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

// Importe y número de cotizaciones del mes en curso y del año acumulado.
function PeriodSplit({ summary, pick }: { summary?: QuoteResultsSummary; pick: 'won' | 'lost' }) {
  if (!summary) return <>—</>;
  const monthName = new Intl.DateTimeFormat('es-MX', { month: 'long', timeZone: 'UTC' }).format(
    new Date(Date.UTC(summary.year, summary.month - 1, 1)),
  );
  const rows: [string, PeriodTotals][] = [
    [monthName.charAt(0).toUpperCase() + monthName.slice(1), summary[pick].month],
    [`Acumulado ${summary.year}`, summary[pick].year],
  ];
  return (
    <dl className="mt-1 space-y-1">
      {rows.map(([label, t]) => (
        <div key={label} className="flex items-baseline justify-between gap-3">
          <dt className="text-xs font-normal tracking-normal text-slate-500">{label}</dt>
          <dd className="text-right">
            <span className="text-lg text-slate-900">{formatMoney(t.amountMxn, 'MXN')}</span>
            <span className="ml-1.5 text-xs font-normal tracking-normal text-slate-500">
              {t.count === 1 ? '1 cot.' : `${t.count} cot.`}
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

function BarsSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      {[70, 45, 30].map((w) => (
        <div key={w}>
          <div className="mb-2 h-3 w-1/3 animate-pulse rounded bg-slate-100" />
          <div className="h-2 animate-pulse rounded-full bg-slate-100" style={{ width: `${w}%` }} />
        </div>
      ))}
    </div>
  );
}
