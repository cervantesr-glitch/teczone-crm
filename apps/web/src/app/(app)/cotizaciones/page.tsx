'use client';

import { QUOTE_STATUS_LABELS, QUOTE_STATUSES } from '@teczone/shared';
import { BadgeCheck, FileText, Search } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { QuoteStatusBadge } from '@/components/quote-badge';
import { EmptyState, ErrorText, Input, LoadingTable, PageHeader, Select, Toolbar, MobileCard } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { formatDateTime, formatDay, formatMoney } from '@/lib/format';
import { canApproveQuotes } from '@/lib/permissions';
import type { QuoteListItem } from '@/lib/quotes';
import { useSession } from '@/lib/session';

interface ListResponse {
  total: number;
  items: QuoteListItem[];
}

export default function QuotesPage() {
  const user = useSession();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState(canApproveQuotes(user) ? 'PENDIENTE_APROBACION' : '');
  const [active, setActive] = useState('true');
  const [data, setData] = useState<ListResponse | null>(null);
  const [pending, setPending] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ pageSize: '200' });
    if (q) params.set('q', q);
    if (status) params.set('status', status);
    else if (active) params.set('active', active);
    try {
      const [list, approvals] = await Promise.all([
        api<ListResponse>(`/quotes?${params}`),
        api<ListResponse>('/quotes?status=PENDIENTE_APROBACION&pageSize=1'),
      ]);
      setData(list);
      setPending(approvals.total);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudieron cargar las cotizaciones');
    }
  }, [q, status, active]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="space-y-4">
      <PageHeader title="Cotizaciones" description="Propuestas con versiones, margen y autorización. Se crean desde una oportunidad." />

      {!!pending && status !== 'PENDIENTE_APROBACION' && (
        <button
          onClick={() => setStatus('PENDIENTE_APROBACION')}
          className="flex w-full items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-800 transition hover:bg-amber-100"
        >
          <BadgeCheck className="size-4 shrink-0" aria-hidden />
          <span className="flex-1">
            {pending === 1 ? 'Hay 1 cotización' : `Hay ${pending} cotizaciones`} pendientes de autorización por margen.
          </span>
          <span className="font-medium">Ver →</span>
        </button>
      )}

      <Toolbar>
        <div className="relative w-full sm:w-auto sm:min-w-64 sm:flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <Input
            className="pl-9"
            placeholder="Buscar folio, oportunidad o cuenta"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Buscar"
          />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Estado" className="w-full sm:w-auto">
          <option value="">Todos los estados</option>
          {QUOTE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {QUOTE_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
        {!status && (
          <Select value={active} onChange={(e) => setActive(e.target.value)} aria-label="Situación" className="w-full sm:w-auto">
            <option value="true">Activas</option>
            <option value="false">Cerradas o vencidas</option>
            <option value="">Todas</option>
          </Select>
        )}
      </Toolbar>

      <ErrorText>{error}</ErrorText>

      {!data && !error && <LoadingTable />}
      {data &&
        (data.items.length ? (
          <>
            <ul className="space-y-2 md:hidden">
              {data.items.map((c) => (
                <MobileCard
                  key={c.id}
                  href={`/cotizaciones/${c.id}`}
                  title={c.opportunity.name}
                  subtitle={c.opportunity.account.name}
                  badge={<QuoteStatusBadge status={c.status} />}
                  meta={
                    <>
                      <span className="font-mono">
                        {c.folio} v{c.version.number}
                      </span>
                      <span className="font-medium text-slate-700">{formatMoney(c.version.total, c.version.currency)}</span>
                      <span>Vigencia {formatDay(c.version.validUntil)}</span>
                    </>
                  }
                />
              ))}
            </ul>
            <div className="table-card hidden md:block">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="table-head">
                  <tr>
                    <th className="px-4 py-2.5">Folio</th>
                    <th className="px-4 py-2.5">Oportunidad / cuenta</th>
                    <th className="px-4 py-2.5">Estado</th>
                    <th className="px-4 py-2.5 text-right">Total</th>
                    <th className="px-4 py-2.5">Vigencia</th>
                    <th className="px-4 py-2.5">Responsable</th>
                    <th className="px-4 py-2.5">Próxima acción</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((c) => (
                    <tr key={c.id} className="table-row">
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                        <Link href={`/cotizaciones/${c.id}`} className="link">
                          {c.folio} v{c.version.number}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/cotizaciones/${c.id}`} className="font-medium text-slate-900 hover:text-brand">
                          {c.opportunity.name}
                        </Link>
                        <div className="text-slate-500">{c.opportunity.account.name}</div>
                      </td>
                      <td className="space-y-1 px-4 py-3">
                        <QuoteStatusBadge status={c.status} />
                        <div className="text-xs text-slate-500">Margen {Number(c.version.marginPct).toFixed(1)}%</div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">{formatMoney(c.version.total, c.version.currency)}</td>
                      <td className="px-4 py-3">{formatDay(c.version.validUntil)}</td>
                      <td className="px-4 py-3">{c.owner.name}</td>
                      <td className="px-4 py-3">
                        {c.nextAction ? (
                          <>
                            <div>{c.nextAction.subject}</div>
                            <div className={new Date(c.nextAction.dueAt) < new Date() ? 'text-red-600' : 'text-slate-500'}>
                              {formatDateTime(c.nextAction.dueAt)}
                            </div>
                          </>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="table-foot">{data.total} cotizaciones</p>
            </div>
          </>
        ) : (
          <EmptyState title="No hay cotizaciones con estos filtros" icon={FileText}>
            Para cotizar, abre una oportunidad y elige “Nueva cotización”.
          </EmptyState>
        ))}
    </div>
  );
}
