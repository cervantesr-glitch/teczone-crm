'use client';

import { PIPELINE_LABELS, PIPELINE_STAGES, PIPELINES, STAGE_LABELS, type Pipeline } from '@teczone/shared';
import { Search, Target } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { StageBadge } from '@/components/stage-badge';
import { EmptyState, ErrorText, Input, LoadingTable, PageHeader, Select, Toolbar, MobileCard } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import type { OpportunityListItem } from '@/lib/crm';
import { formatDateTime, formatDay, formatMoney } from '@/lib/format';

interface ListResponse {
  total: number;
  items: OpportunityListItem[];
}

export default function OpportunitiesPage() {
  const [q, setQ] = useState('');
  const [pipeline, setPipeline] = useState<Pipeline | ''>('');
  const [stage, setStage] = useState('');
  const [open, setOpen] = useState('true');
  const [data, setData] = useState<ListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ pageSize: '200' });
    if (q) params.set('q', q);
    if (pipeline) params.set('pipeline', pipeline);
    if (stage) params.set('stage', stage);
    if (open) params.set('open', open);
    try {
      setData(await api<ListResponse>(`/opportunities?${params}`));
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudieron cargar las oportunidades');
    }
  }, [q, pipeline, stage, open]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const stages = pipeline ? PIPELINE_STAGES[pipeline] : [];

  return (
    <div className="space-y-4">
      <PageHeader title="Oportunidades" description="Negocios en curso por pipeline y etapa, con su monto y próxima acción." />

      <Toolbar>
        <div className="relative w-full sm:w-auto sm:min-w-64 sm:flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <Input
            className="pl-9"
            placeholder="Buscar nombre, cuenta o folio"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Buscar"
          />
        </div>
        <Select
          value={pipeline}
          onChange={(e) => {
            setPipeline(e.target.value as Pipeline | '');
            setStage('');
          }}
          aria-label="Pipeline"
          className="w-full sm:w-auto"
        >
          <option value="">Todos los pipelines</option>
          {PIPELINES.map((p) => (
            <option key={p} value={p}>
              {PIPELINE_LABELS[p]}
            </option>
          ))}
        </Select>
        {pipeline && (
          <Select value={stage} onChange={(e) => setStage(e.target.value)} aria-label="Etapa" className="w-full sm:w-auto">
            <option value="">Todas las etapas</option>
            {stages.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABELS[s]}
              </option>
            ))}
          </Select>
        )}
        <Select value={open} onChange={(e) => setOpen(e.target.value)} aria-label="Situación" className="w-full sm:w-auto">
          <option value="true">Abiertas</option>
          <option value="false">Cerradas</option>
          <option value="">Todas</option>
        </Select>
      </Toolbar>

      <ErrorText>{error}</ErrorText>

      {!data && !error && <LoadingTable />}
      {data &&
        (data.items.length ? (
          <>
            <ul className="space-y-2 md:hidden">
              {data.items.map((o) => (
                <MobileCard
                  key={o.id}
                  href={`/oportunidades/${o.id}`}
                  title={o.name}
                  subtitle={o.account.name}
                  badge={<StageBadge stage={o.stage} />}
                  meta={
                    <>
                      <span className="font-medium text-slate-700">{formatMoney(o.amount, o.currency)}</span>
                      <span>Cierre {formatDay(o.expectedCloseDate)}</span>
                      <span>{o.owner.name}</span>
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
                    <th className="px-4 py-2.5">Etapa</th>
                    <th className="px-4 py-2.5 text-right">Monto</th>
                    <th className="px-4 py-2.5">Cierre estimado</th>
                    <th className="px-4 py-2.5">Responsable</th>
                    <th className="px-4 py-2.5">Próxima acción</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((o) => (
                    <tr key={o.id} className="table-row">
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                        <Link href={`/oportunidades/${o.id}`} className="link">
                          {o.folio}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/oportunidades/${o.id}`} className="font-medium text-slate-900 hover:text-brand">
                          {o.name}
                        </Link>
                        <div className="text-slate-500">
                          {o.account.name} · {PIPELINE_LABELS[o.pipeline]}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StageBadge stage={o.stage} />
                        {o.probability !== null && <div className="text-xs text-slate-500">{o.probability}%</div>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">{formatMoney(o.amount, o.currency)}</td>
                      <td className="px-4 py-3">{formatDay(o.expectedCloseDate)}</td>
                      <td className="px-4 py-3">{o.owner.name}</td>
                      <td className="px-4 py-3">
                        {o.nextAction ? (
                          <>
                            <div>{o.nextAction.subject}</div>
                            <div className={new Date(o.nextAction.dueAt) < new Date() ? 'text-red-600' : 'text-slate-500'}>
                              {formatDateTime(o.nextAction.dueAt)}
                            </div>
                          </>
                        ) : o.closedAt ? (
                          <span className="text-slate-400">Cerrada</span>
                        ) : (
                          <span className="text-amber-700">Sin próxima acción</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="table-foot">{data.total} oportunidades</p>
            </div>
          </>
        ) : (
          <EmptyState title="No hay oportunidades con estos filtros" icon={Target}>
            Las oportunidades se crean al convertir un lead calificado.
          </EmptyState>
        ))}
    </div>
  );
}
