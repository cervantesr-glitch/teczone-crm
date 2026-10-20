'use client';

import {
  ACTIVITY_TYPES,
  BANT_CRITERIA,
  BANT_LABELS,
  canTransition,
  LEAD_INTEREST_LABELS,
  LEAD_STATUS_LABELS,
  qualificationScore,
  type LeadStatus,
} from '@teczone/shared';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { DisqualifyModal } from '@/components/disqualify-modal';
import { SlaBadge, StatusBadge } from '@/components/lead-badges';
import { formToPayload, LeadForm, leadToForm } from '@/components/lead-form';
import { Button, Card, ErrorText, Field, Input, Select, Textarea } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { formatDate, formatDateTime, formatMoney, toLocalInput } from '@/lib/format';
import { ACTIVITY_LABELS, CATEGORY_LABELS, type Activity, type LeadDetail } from '@/lib/leads';
import { canAssignLeads, canWriteLeads, hasFullLeadAccess } from '@/lib/permissions';
import { useSession } from '@/lib/session';
import { useCatalog } from '@/lib/use-catalogs';

// Acciones de estado que se ofrecen como botones; Convertido llega con el módulo de cuentas.
const STATUS_ACTIONS: { to: LeadStatus; label: string }[] = [
  { to: 'CONTACTADO', label: 'Marcar contactado' },
  { to: 'EN_CALIFICACION', label: 'Iniciar calificación' },
  { to: 'CALIFICADO', label: 'Marcar calificado' },
  { to: 'NUEVO', label: 'Reactivar' },
];

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const user = useSession();
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [disqualifying, setDisqualifying] = useState(false);

  const load = useCallback(() => {
    api<LeadDetail>(`/leads/${id}`)
      .then((l) => {
        setLead(l);
        setError(null);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'No se pudo cargar el lead'));
  }, [id]);

  useEffect(load, [load]);

  if (!lead) {
    return error ? <ErrorText>{error}</ErrorText> : <p className="text-slate-500">Cargando…</p>;
  }

  const editable =
    canWriteLeads(user) && lead.status !== 'CONVERTIDO' && (hasFullLeadAccess(user) || lead.owner?.id === user?.id);

  async function run(action: () => Promise<unknown>) {
    try {
      await action();
      setError(null);
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Ocurrió un error');
    }
  }

  const changeStatus = (status: LeadStatus) =>
    run(() => api(`/leads/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) }));

  return (
    <div className="space-y-4">
      <div>
        <Link href="/leads" className="text-sm text-brand hover:underline">
          ← Leads
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{lead.companyName}</h1>
          <StatusBadge status={lead.status} />
          <SlaBadge lead={lead} />
        </div>
        <p className="text-sm text-slate-500">
          <span className="font-mono">{lead.folio}</span> · {LEAD_INTEREST_LABELS[lead.interestType]} · Recibido{' '}
          {formatDateTime(lead.receivedAt)} por {lead.source.name}
        </p>
      </div>

      <ErrorText>{error}</ErrorText>

      {editable && (
        <div className="flex flex-wrap gap-2">
          {STATUS_ACTIONS.filter((a) => canTransition(lead.status, a.to)).map((a) => (
            <Button key={a.to} variant={a.to === 'CALIFICADO' ? 'primary' : 'secondary'} onClick={() => changeStatus(a.to)}>
              {a.label}
            </Button>
          ))}
          {canTransition(lead.status, 'DESCALIFICADO') && (
            <Button variant="secondary" className="text-red-700" onClick={() => setDisqualifying(true)}>
              Descalificar
            </Button>
          )}
          {lead.status === 'CALIFICADO' && (
            <Button variant="secondary" disabled title="Llega con el módulo de cuentas y oportunidades">
              Convertir (próximamente)
            </Button>
          )}
        </div>
      )}

      {lead.status === 'DESCALIFICADO' && lead.disqualificationReason && (
        <div className="rounded-md bg-slate-100 px-4 py-3 text-sm">
          <strong>Descalificado:</strong> {lead.disqualificationReason.name}. {lead.disqualificationNotes}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {editing ? (
            <Card title="Editar datos">
              <LeadForm
                initial={leadToForm(lead)}
                submitLabel="Guardar cambios"
                onCancel={() => setEditing(false)}
                onSubmit={async (v) => {
                  const { ownerId: _o, ...payload } = formToPayload(v) as ReturnType<typeof formToPayload> & { ownerId?: string };
                  await run(() => api(`/leads/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }));
                  setEditing(false);
                }}
              />
            </Card>
          ) : (
            <LeadData lead={lead} onEdit={editable ? () => setEditing(true) : undefined} />
          )}
          <Activities lead={lead} editable={editable} onChanged={load} onError={setError} />
        </div>
        <div className="space-y-4">
          <OwnerCard lead={lead} onChanged={load} onError={setError} />
          <QualificationCard lead={lead} editable={editable} onChanged={load} onError={setError} />
          <HistoryCard lead={lead} />
          {canAssignLeads(user) && lead.status !== 'CONVERTIDO' && (
            <Button
              variant="ghost"
              className="text-red-700"
              onClick={() => {
                if (window.confirm('¿Eliminar este lead? Quedará en la auditoría.')) {
                  run(() => api(`/leads/${id}`, { method: 'DELETE' })).then(() => router.push('/leads'));
                }
              }}
            >
              Eliminar lead
            </Button>
          )}
        </div>
      </div>

      {disqualifying && (
        <DisqualifyModal
          onCancel={() => setDisqualifying(false)}
          onConfirm={async (reasonId, notes) => {
            await api(`/leads/${id}/status`, {
              method: 'POST',
              body: JSON.stringify({ status: 'DESCALIFICADO', disqualificationReasonId: reasonId, disqualificationNotes: notes }),
            });
            setDisqualifying(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-sm">{value || '—'}</dd>
    </div>
  );
}

function LeadData({ lead, onEdit }: { lead: LeadDetail; onEdit?: () => void }) {
  return (
    <Card
      title="Datos"
      actions={
        onEdit && (
          <Button variant="ghost" onClick={onEdit}>
            Editar
          </Button>
        )
      }
    >
      <dl className="grid gap-3 sm:grid-cols-2">
        <Row label="Contacto" value={`${lead.contactName}${lead.contactTitle ? ` · ${lead.contactTitle}` : ''}`} />
        <Row label="Correo" value={lead.email && <a className="text-brand hover:underline" href={`mailto:${lead.email}`}>{lead.email}</a>} />
        <Row label="Teléfono" value={lead.phone && <a className="text-brand hover:underline" href={`tel:${lead.phone}`}>{lead.phone}</a>} />
        <Row label="WhatsApp" value={lead.whatsapp} />
        <Row label="RFC" value={lead.rfc} />
        <Row label="Industria" value={lead.industry} />
        <Row label="Tamaño" value={lead.companySize} />
        <Row label="Ubicación" value={[lead.city, lead.state].filter(Boolean).join(', ')} />
        <Row label="Presupuesto estimado" value={lead.estimatedBudget && formatMoney(lead.estimatedBudget, lead.currency)} />
        <Row label="Fecha estimada de compra" value={lead.expectedPurchaseDate && formatDate(lead.expectedPurchaseDate)} />
      </dl>
      {lead.need && (
        <div className="mt-3">
          <dt className="text-xs text-slate-500">Necesidad</dt>
          <dd className="whitespace-pre-line text-sm">{lead.need}</dd>
        </div>
      )}
      {lead.productsOfInterest.length > 0 && (
        <div className="mt-3">
          <dt className="mb-1 text-xs text-slate-500">Productos o servicios de interés</dt>
          <ul className="list-inside list-disc text-sm">
            {lead.productsOfInterest.map((p) => (
              <li key={p.id}>
                {CATEGORY_LABELS[p.category]}: {p.description}
                {p.quantity ? ` (${p.quantity})` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

function OwnerCard({ lead, onChanged, onError }: { lead: LeadDetail; onChanged: () => void; onError: (e: string) => void }) {
  const user = useSession();
  const sellers = useCatalog('sellers');
  const assign = async (ownerId: string | null) => {
    try {
      await api(`/leads/${lead.id}/owner`, { method: 'PUT', body: JSON.stringify({ ownerId }) });
      onChanged();
    } catch (e) {
      onError(e instanceof ApiError ? e.message : 'No se pudo asignar');
    }
  };
  const converted = lead.status === 'CONVERTIDO';
  return (
    <Card title="Responsable">
      {canAssignLeads(user) && !converted ? (
        <Select value={lead.owner?.id ?? ''} onChange={(e) => assign(e.target.value || null)} aria-label="Responsable">
          <option value="">Sin asignar</option>
          {sellers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm">{lead.owner?.name ?? 'Sin asignar'}</span>
          {!lead.owner && canWriteLeads(user) && !converted && user && (
            <Button variant="secondary" onClick={() => assign(user.id)}>
              Tomar lead
            </Button>
          )}
        </div>
      )}
      <p className="mt-2 text-xs text-slate-500">Capturado por {lead.createdBy.name}</p>
    </Card>
  );
}

function QualificationCard({
  lead,
  editable,
  onChanged,
  onError,
}: {
  lead: LeadDetail;
  editable: boolean;
  onChanged: () => void;
  onError: (e: string) => void;
}) {
  const initial = lead.qualification ?? { budget: false, authority: false, need: false, timeline: false, notes: null };
  const [q, setQ] = useState(initial);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setQ(lead.qualification ?? { budget: false, authority: false, need: false, timeline: false, notes: null });
    setDirty(false);
  }, [lead.qualification]);

  async function save() {
    try {
      await api(`/leads/${lead.id}/qualification`, { method: 'PUT', body: JSON.stringify(q) });
      onChanged();
    } catch (e) {
      onError(e instanceof ApiError ? e.message : 'No se pudo guardar la calificación');
    }
  }

  return (
    <Card title="Calificación" actions={<span className="text-sm font-semibold">{qualificationScore(q)} / 100</span>}>
      <div className="space-y-2">
        {BANT_CRITERIA.map((k) => (
          <label key={k} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={q[k]}
              disabled={!editable}
              onChange={(e) => {
                setQ({ ...q, [k]: e.target.checked });
                setDirty(true);
              }}
            />
            {BANT_LABELS[k]}
          </label>
        ))}
        <Textarea
          placeholder="Notas de calificación"
          value={q.notes ?? ''}
          disabled={!editable}
          onChange={(e) => {
            setQ({ ...q, notes: e.target.value });
            setDirty(true);
          }}
          aria-label="Notas de calificación"
        />
        {editable && (
          <Button onClick={save} disabled={!dirty} className="w-full">
            Guardar calificación
          </Button>
        )}
      </div>
    </Card>
  );
}

function HistoryCard({ lead }: { lead: LeadDetail }) {
  return (
    <Card title="Historial de estados">
      <ol className="space-y-2 text-sm">
        {lead.statusHistory.map((h) => (
          <li key={h.id}>
            <div>
              {h.fromStatus ? `${LEAD_STATUS_LABELS[h.fromStatus]} → ` : ''}
              <strong>{LEAD_STATUS_LABELS[h.toStatus]}</strong>
            </div>
            <div className="text-xs text-slate-500">
              {h.user.name} · {formatDateTime(h.createdAt)}
            </div>
            {h.comment && <div className="text-xs text-slate-600">{h.comment}</div>}
          </li>
        ))}
      </ol>
    </Card>
  );
}

function Activities({
  lead,
  editable,
  onChanged,
  onError,
}: {
  lead: LeadDetail;
  editable: boolean;
  onChanged: () => void;
  onError: (e: string) => void;
}) {
  const [type, setType] = useState('LLAMADA');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [dueAt, setDueAt] = useState(() => toLocalInput(new Date(Date.now() + 24 * 3600 * 1000)));
  const [saving, setSaving] = useState(false);

  async function add(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api(`/leads/${lead.id}/activities`, {
        method: 'POST',
        body: JSON.stringify({
          type,
          subject,
          description: description || null,
          dueAt: type === 'TAREA' ? new Date(dueAt).toISOString() : null,
        }),
      });
      setSubject('');
      setDescription('');
      onChanged();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'No se pudo registrar la actividad');
    } finally {
      setSaving(false);
    }
  }

  async function toggle(a: Activity) {
    try {
      await api(`/leads/${lead.id}/activities/${a.id}/toggle`, { method: 'POST' });
      onChanged();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'No se pudo actualizar la tarea');
    }
  }

  const active = !['DESCALIFICADO', 'CONVERTIDO'].includes(lead.status);

  return (
    <Card title="Actividades y próxima acción">
      {active && !lead.nextAction && (
        <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Este lead no tiene próxima acción. Programa una tarea con fecha para no perder el seguimiento.
        </p>
      )}
      {editable && (
        <form onSubmit={add} className="mb-4 space-y-2 rounded-md bg-slate-50 p-3">
          <div className="flex flex-wrap gap-2">
            <Select value={type} onChange={(e) => setType(e.target.value)} className="w-36" aria-label="Tipo">
              {ACTIVITY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {ACTIVITY_LABELS[t]}
                </option>
              ))}
            </Select>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={type === 'TAREA' ? 'Próxima acción, ej. enviar catálogo' : 'Asunto'}
              aria-label="Asunto"
              className="flex-1"
            />
            {type === 'TAREA' && (
              <Input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className="w-52" aria-label="Vence" />
            )}
          </div>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalle (opcional)" rows={2} aria-label="Detalle" />
          <div className="flex justify-end">
            <Button type="submit" disabled={saving || !subject.trim()}>
              {type === 'TAREA' ? 'Programar tarea' : 'Registrar'}
            </Button>
          </div>
        </form>
      )}
      {lead.activities.length === 0 ? (
        <p className="text-sm text-slate-500">Sin actividades.</p>
      ) : (
        <ul className="space-y-3">
          {lead.activities.map((a) => (
            <li key={a.id} className="flex gap-3 text-sm">
              {a.type === 'TAREA' ? (
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={!!a.completedAt}
                  disabled={!editable}
                  onChange={() => toggle(a)}
                  aria-label={`Completar ${a.subject}`}
                />
              ) : (
                <span className="mt-0.5 w-4 text-center text-slate-400">•</span>
              )}
              <div className="flex-1">
                <div className={a.completedAt ? 'text-slate-400 line-through' : ''}>
                  <span className="font-medium">{ACTIVITY_LABELS[a.type]}:</span> {a.subject}
                </div>
                {a.description && <div className="whitespace-pre-line text-slate-600">{a.description}</div>}
                <div className="text-xs text-slate-500">
                  {a.owner.name} ·{' '}
                  {a.type === 'TAREA' ? (
                    <span className={!a.completedAt && a.dueAt && new Date(a.dueAt) < new Date() ? 'text-red-600' : ''}>
                      vence {formatDateTime(a.dueAt)}
                    </span>
                  ) : (
                    formatDateTime(a.occurredAt ?? a.createdAt)
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
