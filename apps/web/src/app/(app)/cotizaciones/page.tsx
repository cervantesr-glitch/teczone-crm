'use client';

import { QUOTE_STATUS_LABELS, QUOTE_STATUSES } from '@teczone/shared';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { QuoteStatusBadge } from '@/components/quote-badge';
import { ErrorText, Input, Select } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Cotizaciones</h1>
        <p className="text-sm text-slate-500">Se crean desde una oportunidad.</p>
      </div>

      {!!pending && status !== 'PENDIENTE_APROBACION' && (
        <button
          onClick={() => setStatus('PENDIENTE_APROBACION')}
          className="w-full rounded-md bg-amber-50 px-3 py-2 text-left text-sm text-amber-800 hover:bg-amber-100"
        >
          {pending === 1 ? 'Hay 1 cotización' : `Hay ${pending} cotizaciones`} pendientes de autorización por margen. Ver →
        </button>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-48 flex-1">
          <Input placeholder="Buscar folio, oportunidad o cuenta" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar" />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Estado" className="w-auto">
          <option value="">Todos los estados</option>
          {QUOTE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {QUOTE_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
        {!status && (
          <Select value={active} onChange={(e) => setActive(e.target.value)} aria-label="Situación" className="w-auto">
            <option value="true">Activas</option>
            <option value="false">Cerradas o vencidas</option>
            <option value="">Todas</option>
          </Select>
        )}
      </div>

      <ErrorText>{error}</ErrorText>

      {data &&
        (data.items.length ? (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Folio</th>
                  <th className="px-3 py-2">Oportunidad / cuenta</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2">Vigencia</th>
                  <th className="px-3 py-2">Responsable</th>
                  <th className="px-3 py-2">Próxima acción</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">
                      <Link href={`/cotizaciones/${c.id}`} className="text-brand hover:underline">
                        {c.folio} v{c.version.number}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <Link href={`/cotizaciones/${c.id}`} className="font-medium hover:underline">
                        {c.opportunity.name}
                      </Link>
                      <div className="text-slate-500">{c.opportunity.account.name}</div>
                    </td>
                    <td className="space-y-1 px-3 py-2">
                      <QuoteStatusBadge status={c.status} />
                      <div className="text-xs text-slate-500">Margen {Number(c.version.marginPct).toFixed(1)}%</div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">{formatMoney(c.version.total, c.version.currency)}</td>
                    <td className="px-3 py-2">{formatDate(c.version.validUntil)}</td>
                    <td className="px-3 py-2">{c.owner.name}</td>
                    <td className="px-3 py-2">
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
            <p className="border-t border-slate-100 px-3 py-2 text-xs text-slate-500">{data.total} cotizaciones</p>
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
            No hay cotizaciones con estos filtros. Para cotizar, abre una oportunidad y elige “Nueva cotización”.
          </p>
        ))}
    </div>
  );
}
