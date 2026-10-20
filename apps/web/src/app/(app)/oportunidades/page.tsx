'use client';

import { PIPELINE_LABELS, PIPELINE_STAGES, PIPELINES, STAGE_LABELS, type Pipeline } from '@teczone/shared';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { StageBadge } from '@/components/stage-badge';
import { ErrorText, Input, Select } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import type { OpportunityListItem } from '@/lib/crm';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';

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
      <h1 className="text-2xl font-semibold">Oportunidades</h1>

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-48 flex-1">
          <Input placeholder="Buscar nombre, cuenta o folio" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar" />
        </div>
        <Select
          value={pipeline}
          onChange={(e) => {
            setPipeline(e.target.value as Pipeline | '');
            setStage('');
          }}
          aria-label="Pipeline"
          className="w-auto"
        >
          <option value="">Todos los pipelines</option>
          {PIPELINES.map((p) => (
            <option key={p} value={p}>
              {PIPELINE_LABELS[p]}
            </option>
          ))}
        </Select>
        {pipeline && (
          <Select value={stage} onChange={(e) => setStage(e.target.value)} aria-label="Etapa" className="w-auto">
            <option value="">Todas las etapas</option>
            {stages.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABELS[s]}
              </option>
            ))}
          </Select>
        )}
        <Select value={open} onChange={(e) => setOpen(e.target.value)} aria-label="Situación" className="w-auto">
          <option value="true">Abiertas</option>
          <option value="false">Cerradas</option>
          <option value="">Todas</option>
        </Select>
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
                  <th className="px-3 py-2">Etapa</th>
                  <th className="px-3 py-2 text-right">Monto</th>
                  <th className="px-3 py-2">Cierre estimado</th>
                  <th className="px-3 py-2">Responsable</th>
                  <th className="px-3 py-2">Próxima acción</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((o) => (
                  <tr key={o.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">
                      <Link href={`/oportunidades/${o.id}`} className="text-brand hover:underline">
                        {o.folio}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <Link href={`/oportunidades/${o.id}`} className="font-medium hover:underline">
                        {o.name}
                      </Link>
                      <div className="text-slate-500">
                        {o.account.name} · {PIPELINE_LABELS[o.pipeline]}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <StageBadge stage={o.stage} />
                      {o.probability !== null && <div className="text-xs text-slate-500">{o.probability}%</div>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">{formatMoney(o.amount, o.currency)}</td>
                    <td className="px-3 py-2">{formatDate(o.expectedCloseDate)}</td>
                    <td className="px-3 py-2">{o.owner.name}</td>
                    <td className="px-3 py-2">
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
            <p className="border-t border-slate-100 px-3 py-2 text-xs text-slate-500">{data.total} oportunidades</p>
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
            No hay oportunidades con estos filtros. Se crean al convertir un lead calificado.
          </p>
        ))}
    </div>
  );
}
