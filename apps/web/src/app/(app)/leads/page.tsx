'use client';

import {
  canTransition,
  LEAD_INTEREST_LABELS,
  LEAD_INTEREST_TYPES,
  LEAD_STATUS_LABELS,
  LEAD_STATUSES,
  type LeadStatus,
} from '@teczone/shared';
import { AlarmClock, Columns3, List, Plus, Search, UserPlus, UserX } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { DisqualifyModal } from '@/components/disqualify-modal';
import { SlaBadge, StatusBadge } from '@/components/lead-badges';
import { ButtonLink, EmptyState, ErrorText, Input, LoadingTable, PageHeader, Select, StatCard, Toolbar, MobileCard } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/format';
import type { LeadListItem } from '@/lib/leads';
import { canAssignLeads, canWriteLeads, hasFullLeadAccess } from '@/lib/permissions';
import { useSession } from '@/lib/session';
import { useCatalog } from '@/lib/use-catalogs';

interface ListResponse {
  total: number;
  items: LeadListItem[];
}

interface Summary {
  byStatus: Partial<Record<LeadStatus, number>>;
  overdueFirstContact: number;
  unassigned: number;
}

type View = 'lista' | 'tablero';

export default function LeadsPage() {
  const user = useSession();
  const sellers = useCatalog('sellers');
  const [view, setView] = useState<View>('lista');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [interestType, setInterestType] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [data, setData] = useState<ListResponse | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ pageSize: '200' });
    if (q) params.set('q', q);
    if (status && view === 'lista') params.set('status', status);
    if (interestType) params.set('interestType', interestType);
    if (ownerId) params.set('ownerId', ownerId);
    try {
      const [list, sum] = await Promise.all([api<ListResponse>(`/leads?${params}`), api<Summary>('/leads/summary')]);
      setData(list);
      setSummary(sum);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudieron cargar los leads');
    }
  }, [q, status, interestType, ownerId, view]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const active =
    (summary?.byStatus.NUEVO ?? 0) +
    (summary?.byStatus.CONTACTADO ?? 0) +
    (summary?.byStatus.EN_CALIFICACION ?? 0) +
    (summary?.byStatus.CALIFICADO ?? 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Leads"
        description="Prospectos recibidos, su estado y el tiempo de primer contacto."
        actions={
          canWriteLeads(user) && (
            <ButtonLink href="/leads/nuevo">
              <Plus className="size-4" /> Nuevo lead
            </ButtonLink>
          )
        }
      />

      {summary && (
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <StatCard label="Activos" value={active} icon={UserPlus} />
          <StatCard
            label="Contacto vencido"
            value={summary.overdueFirstContact}
            icon={AlarmClock}
            tone={summary.overdueFirstContact > 0 ? 'alert' : 'good'}
          />
          <StatCard label="Sin responsable" value={summary.unassigned} icon={UserX} tone={summary.unassigned > 0 ? 'warn' : 'neutral'} />
        </div>
      )}

      <Toolbar>
        <div className="relative w-full sm:w-auto sm:min-w-64 sm:flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <Input
            className="pl-9"
            placeholder="Buscar empresa, contacto, correo, teléfono, RFC o folio"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Buscar"
          />
        </div>
        {view === 'lista' && (
          <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Estado" className="w-full sm:w-auto">
            <option value="">Todos los estados</option>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {LEAD_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        )}
        <Select value={interestType} onChange={(e) => setInterestType(e.target.value)} aria-label="Interés" className="w-full sm:w-auto">
          <option value="">Todo interés</option>
          {LEAD_INTEREST_TYPES.map((t) => (
            <option key={t} value={t}>
              {LEAD_INTEREST_LABELS[t]}
            </option>
          ))}
        </Select>
        <Select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} aria-label="Responsable" className="w-full sm:w-auto">
          <option value="">{hasFullLeadAccess(user) ? 'Todos los responsables' : 'Míos y sin asignar'}</option>
          {user && <option value={user.id}>Solo míos</option>}
          <option value="none">Sin responsable</option>
          {hasFullLeadAccess(user) &&
            sellers
              .filter((s) => s.id !== user?.id)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
        </Select>
        <div className="flex rounded-lg bg-slate-100 p-0.5" role="tablist">
          {(['lista', 'tablero'] as View[]).map((v) => {
            const Icon = v === 'lista' ? List : Columns3;
            return (
              <button
                key={v}
                role="tab"
                aria-selected={view === v}
                onClick={() => setView(v)}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium capitalize transition ${
                  view === v ? 'bg-white text-brand shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className="size-4" aria-hidden />
                {v}
              </button>
            );
          })}
        </div>
      </Toolbar>

      <ErrorText>{error}</ErrorText>

      {!data && !error && <LoadingTable />}
      {data &&
        (view === 'lista' ? (
          <LeadTable items={data.items} total={data.total} />
        ) : (
          <LeadBoard
            items={data.items}
            onChanged={load}
            canMove={canWriteLeads(user)}
            canMoveAny={canAssignLeads(user)}
            userId={user?.id}
          />
        ))}
    </div>
  );
}

function LeadTable({ items, total }: { items: LeadListItem[]; total: number }) {
  if (!items.length) {
    return (
      <EmptyState title="No hay leads con estos filtros" icon={UserPlus}>
        Prueba con otra búsqueda o limpia los filtros.
      </EmptyState>
    );
  }
  return (
    <>
      <ul className="space-y-2 md:hidden">
        {items.map((l) => (
          <MobileCard
            key={l.id}
            href={`/leads/${l.id}`}
            title={l.companyName}
            subtitle={l.contactName}
            badge={<StatusBadge status={l.status} />}
            meta={
              <>
                <span className="font-mono">{l.folio}</span>
                <span>{l.owner?.name ?? 'Sin asignar'}</span>
                <span>{formatDate(l.receivedAt)}</span>
                <SlaBadge lead={l} />
              </>
            }
          />
        ))}
        <li className="px-1 text-xs text-slate-500">{items.length < total ? `Mostrando ${items.length} de ${total}` : `${total} leads`}</li>
      </ul>
      <div className="table-card hidden md:block">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="table-head">
            <tr>
              <th className="px-4 py-2.5">Folio</th>
              <th className="px-4 py-2.5">Empresa / contacto</th>
              <th className="px-4 py-2.5">Interés</th>
              <th className="px-4 py-2.5">Estado</th>
              <th className="px-4 py-2.5">Responsable</th>
              <th className="px-4 py-2.5">Próxima acción</th>
              <th className="px-4 py-2.5">Recibido</th>
            </tr>
          </thead>
          <tbody>
            {items.map((l) => (
              <tr key={l.id} className="table-row">
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                  <Link href={`/leads/${l.id}`} className="link">
                    {l.folio}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/leads/${l.id}`} className="font-medium text-slate-900 hover:text-brand">
                    {l.companyName}
                  </Link>
                  <div className="text-slate-500">{l.contactName}</div>
                </td>
                <td className="px-4 py-3">{LEAD_INTEREST_LABELS[l.interestType]}</td>
                <td className="space-y-1 px-4 py-3">
                  <StatusBadge status={l.status} />
                  <div>
                    <SlaBadge lead={l} />
                  </div>
                </td>
                <td className="px-4 py-3">{l.owner?.name ?? <span className="text-amber-700">Sin asignar</span>}</td>
                <td className="px-4 py-3">
                  {l.nextAction ? (
                    <>
                      <div>{l.nextAction.subject}</div>
                      <div className={new Date(l.nextAction.dueAt) < new Date() ? 'text-red-600' : 'text-slate-500'}>
                        {formatDateTime(l.nextAction.dueAt)}
                      </div>
                    </>
                  ) : (
                    <span className="text-slate-400">Sin próxima acción</span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-slate-500">{formatDate(l.receivedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="table-foot">{items.length < total ? `Mostrando ${items.length} de ${total}` : `${total} leads`}</div>
      </div>
    </>
  );
}

const BOARD_COLUMNS: LeadStatus[] = ['NUEVO', 'CONTACTADO', 'EN_CALIFICACION', 'CALIFICADO', 'DESCALIFICADO'];

function LeadBoard({
  items,
  onChanged,
  canMove,
  canMoveAny,
  userId,
}: {
  items: LeadListItem[];
  onChanged: () => void;
  canMove: boolean;
  canMoveAny: boolean;
  userId?: string;
}) {
  const [dragging, setDragging] = useState<LeadListItem | null>(null);
  const [pendingDisqualify, setPendingDisqualify] = useState<LeadListItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  const movable = (l: LeadListItem) => canMove && (canMoveAny || l.owner?.id === userId);

  async function move(lead: LeadListItem, to: LeadStatus) {
    if (lead.status === to) return;
    if (!canTransition(lead.status, to)) {
      setError(`No se puede pasar de ${LEAD_STATUS_LABELS[lead.status]} a ${LEAD_STATUS_LABELS[to]}`);
      return;
    }
    if (to === 'DESCALIFICADO') {
      setPendingDisqualify(lead);
      return;
    }
    try {
      await api(`/leads/${lead.id}/status`, { method: 'POST', body: JSON.stringify({ status: to }) });
      setError(null);
      onChanged();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo mover el lead');
    }
  }

  return (
    <div className="space-y-2">
      <ErrorText>{error}</ErrorText>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {BOARD_COLUMNS.map((col) => {
          const cards = items.filter((l) => l.status === col);
          const droppable = dragging && canTransition(dragging.status, col);
          return (
            <div
              key={col}
              onDragOver={(e) => droppable && e.preventDefault()}
              onDrop={() => {
                if (dragging) move(dragging, col);
                setDragging(null);
              }}
              className={`w-72 shrink-0 rounded-xl p-2.5 transition ${droppable ? 'bg-brand-50 ring-2 ring-brand-300' : 'bg-slate-100/80'}`}
            >
              <div className="mb-2.5 flex items-center justify-between px-1 text-sm font-semibold text-slate-700">
                <span>{LEAD_STATUS_LABELS[col]}</span>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500 shadow-xs">{cards.length}</span>
              </div>
              <div className="space-y-2">
                {cards.map((l) => (
                  <div
                    key={l.id}
                    draggable={movable(l)}
                    onDragStart={() => setDragging(l)}
                    onDragEnd={() => setDragging(null)}
                    className={`rounded-lg border border-slate-200/80 bg-white p-3 text-sm shadow-card transition hover:border-brand-200 hover:shadow-md ${movable(l) ? 'cursor-grab active:cursor-grabbing' : ''}`}
                  >
                    <Link href={`/leads/${l.id}`} className="font-medium hover:text-brand">
                      {l.companyName}
                    </Link>
                    <div className="text-slate-500">{l.contactName}</div>
                    <div className="mt-2 flex flex-wrap items-center gap-1 text-xs text-slate-500">
                      <span className="font-mono">{l.folio}</span>·<span>{l.owner?.name ?? 'Sin asignar'}</span>
                      {l.score !== null && <span>· {l.score} pts</span>}
                    </div>
                    <div className="mt-1">
                      <SlaBadge lead={l} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-slate-500">
        Arrastra una tarjeta para cambiar su estado. Los leads convertidos aparecen en la vista de lista.
      </p>
      {pendingDisqualify && (
        <DisqualifyModal
          onCancel={() => setPendingDisqualify(null)}
          onConfirm={async (reasonId, notes) => {
            await api(`/leads/${pendingDisqualify.id}/status`, {
              method: 'POST',
              body: JSON.stringify({ status: 'DESCALIFICADO', disqualificationReasonId: reasonId, disqualificationNotes: notes }),
            });
            setPendingDisqualify(null);
            onChanged();
          }}
        />
      )}
    </div>
  );
}
