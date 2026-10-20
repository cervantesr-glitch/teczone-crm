'use client';

import { CLOSED_STAGES, PIPELINE_LABELS, PIPELINE_STAGES, STAGE_LABELS, type OpportunityStage } from '@teczone/shared';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Activities } from '@/components/activities';
import { StageBadge } from '@/components/stage-badge';
import { Button, Card, ErrorText, Field, Input, Modal, Select, Textarea } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import type { OpportunityDetail } from '@/lib/crm';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import { canEditOpportunity, isManager } from '@/lib/permissions';
import { useSession } from '@/lib/session';

const errorMessage = (e: unknown, fallback: string) =>
  e instanceof ApiError ? e.errors?.map((x) => x.message).join('. ') || e.message : fallback;

interface EditForm {
  name: string;
  amount: string;
  currency: string;
  expectedCloseDate: string;
  probability: string;
  primaryContactId: string;
}

export default function OpportunityPage() {
  const { id } = useParams<{ id: string }>();
  const user = useSession();
  const [opp, setOpp] = useState<OpportunityDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditForm | null>(null);
  const [losing, setLosing] = useState(false);

  const load = useCallback(async () => {
    try {
      setOpp(await api<OpportunityDetail>(`/opportunities/${id}`));
    } catch (e) {
      setError(errorMessage(e, 'No se pudo cargar la oportunidad'));
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!opp) return error ? <ErrorText>{error}</ErrorText> : <p className="text-slate-500">Cargando…</p>;

  const editable = canEditOpportunity(user, opp.owner.id);
  const closed = CLOSED_STAGES.includes(opp.stage);
  // Reabrir una oportunidad cerrada es de gerencia (igual que la API).
  const canMoveStage = editable && (!closed || isManager(user));

  async function changeStage(stage: OpportunityStage, extra: { lostReason?: string; comment?: string } = {}) {
    try {
      await api(`/opportunities/${id}/stage`, { method: 'POST', body: JSON.stringify({ stage, ...extra }) });
      setError(null);
      setLosing(false);
      await load();
    } catch (e) {
      setError(errorMessage(e, 'No se pudo cambiar la etapa'));
    }
  }

  function startEdit() {
    const o = opp!;
    setEditing({
      name: o.name,
      amount: o.amount ?? '',
      currency: o.currency ?? 'MXN',
      expectedCloseDate: o.expectedCloseDate?.slice(0, 10) ?? '',
      probability: o.probability === null ? '' : String(o.probability),
      primaryContactId: o.primaryContact?.id ?? '',
    });
  }

  async function save() {
    if (!editing) return;
    try {
      await api(`/opportunities/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: editing.name,
          amount: editing.amount ? Number(editing.amount) : null,
          currency: editing.amount ? editing.currency : null,
          expectedCloseDate: editing.expectedCloseDate || null,
          probability: editing.probability ? Number(editing.probability) : null,
          primaryContactId: editing.primaryContactId || null,
        }),
      });
      setEditing(null);
      setError(null);
      await load();
    } catch (e) {
      setError(errorMessage(e, 'No se pudo guardar la oportunidad'));
    }
  }

  const stages = PIPELINE_STAGES[opp.pipeline] as readonly OpportunityStage[];
  const openStages = stages.filter((s) => !CLOSED_STAGES.includes(s));
  const currentIndex = openStages.indexOf(opp.stage);

  return (
    <div className="space-y-4">
      <div>
        <Link href="/oportunidades" className="text-sm text-brand hover:underline">
          ← Oportunidades
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{opp.name}</h1>
          <StageBadge stage={opp.stage} />
        </div>
        <p className="text-sm text-slate-500">
          <span className="font-mono">{opp.folio}</span> ·{' '}
          <Link href={`/cuentas/${opp.account.id}`} className="text-brand hover:underline">
            {opp.account.name}
          </Link>{' '}
          · {PIPELINE_LABELS[opp.pipeline]} · Responsable: {opp.owner.name}
        </p>
      </div>

      <ErrorText>{error}</ErrorText>

      <Card title="Etapa">
        <ol className="flex flex-wrap gap-2">
          {openStages.map((s, i) => {
            const current = s === opp.stage;
            const done = !closed && i < currentIndex;
            return (
              <li key={s}>
                <button
                  disabled={!canMoveStage || current}
                  onClick={() => changeStage(s)}
                  className={`rounded-full border px-3 py-1 text-sm ${
                    current ? 'border-brand bg-brand text-white' : done ? 'border-sky-200 bg-sky-50 text-sky-800' : 'border-slate-300 bg-white'
                  } ${canMoveStage && !current ? 'hover:border-brand' : ''}`}
                >
                  {STAGE_LABELS[s]}
                </button>
              </li>
            );
          })}
        </ol>
        {canMoveStage && !closed && (
          <div className="mt-3 flex gap-2">
            <Button onClick={() => changeStage('GANADA')} className="bg-emerald-600 hover:bg-emerald-700">
              Marcar ganada
            </Button>
            <Button variant="secondary" onClick={() => setLosing(true)}>
              Marcar perdida
            </Button>
          </div>
        )}
        {closed && (
          <p className="mt-3 text-sm text-slate-600">
            Cerrada el {formatDate(opp.closedAt)}
            {opp.lostReason && ` · Motivo: ${opp.lostReason}`}
            {canMoveStage ? '. Elige una etapa para reabrirla.' : '.'}
          </p>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Activities
            basePath={`/opportunities/${id}`}
            activities={opp.activities}
            hasNextAction={!!opp.nextAction}
            active={!closed}
            editable={editable}
            onChanged={load}
            onError={setError}
          />
          <Card title="Historial de etapas">
            <ul className="space-y-2 text-sm">
              {opp.stageHistory.map((h) => (
                <li key={h.id}>
                  <span className="font-medium">
                    {h.fromStage ? `${STAGE_LABELS[h.fromStage]} → ` : ''}
                    {STAGE_LABELS[h.toStage]}
                  </span>
                  <span className="text-slate-500">
                    {' '}
                    · {h.user.name} · {formatDateTime(h.createdAt)}
                  </span>
                  {h.comment && <div className="text-slate-600">{h.comment}</div>}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <Card
          title="Datos"
          actions={
            editable &&
            !editing && (
              <Button variant="ghost" onClick={startEdit}>
                Editar
              </Button>
            )
          }
        >
          {editing ? (
            <div className="space-y-3">
              <Field label="Nombre *">
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </Field>
              <Field label="Monto">
                <div className="flex gap-2">
                  <Input type="number" min={0} value={editing.amount} onChange={(e) => setEditing({ ...editing, amount: e.target.value })} />
                  <Select
                    value={editing.currency}
                    onChange={(e) => setEditing({ ...editing, currency: e.target.value })}
                    className="w-24"
                    aria-label="Moneda"
                  >
                    <option>MXN</option>
                    <option>USD</option>
                  </Select>
                </div>
              </Field>
              <Field label="Cierre estimado">
                <Input
                  type="date"
                  value={editing.expectedCloseDate}
                  onChange={(e) => setEditing({ ...editing, expectedCloseDate: e.target.value })}
                />
              </Field>
              <Field label="Probabilidad (%)" hint="Se ajusta sola al cambiar de etapa">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={editing.probability}
                  onChange={(e) => setEditing({ ...editing, probability: e.target.value })}
                />
              </Field>
              <Field label="Contacto principal">
                <Select value={editing.primaryContactId} onChange={(e) => setEditing({ ...editing, primaryContactId: e.target.value })}>
                  <option value="">Sin contacto</option>
                  {opp.account.contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setEditing(null)}>
                  Cancelar
                </Button>
                <Button onClick={save} disabled={!editing.name.trim()}>
                  Guardar
                </Button>
              </div>
            </div>
          ) : (
            <dl className="space-y-2 text-sm">
              <Item label="Monto">{formatMoney(opp.amount, opp.currency)}</Item>
              <Item label="Probabilidad">{opp.probability === null ? '—' : `${opp.probability}%`}</Item>
              <Item label="Cierre estimado">{formatDate(opp.expectedCloseDate)}</Item>
              <Item label="Contacto principal">{opp.primaryContact?.name ?? '—'}</Item>
              {opp.sourceLeads.length > 0 && (
                <Item label="Lead de origen">
                  {opp.sourceLeads.map((l) => (
                    <Link key={l.id} href={`/leads/${l.id}`} className="mr-2 font-mono text-brand hover:underline">
                      {l.folio}
                    </Link>
                  ))}
                </Item>
              )}
            </dl>
          )}
        </Card>
      </div>

      {losing && <LostModal onClose={() => setLosing(false)} onConfirm={(lostReason) => changeStage('PERDIDA', { lostReason })} />}
    </div>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function LostModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState('');
  return (
    <Modal title="Marcar como perdida" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Motivo de la pérdida *">
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={() => onConfirm(reason)} disabled={!reason.trim()}>
            Marcar perdida
          </Button>
        </div>
      </div>
    </Modal>
  );
}
