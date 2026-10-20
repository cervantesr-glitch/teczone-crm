'use client';

import { ACTIVITY_TYPES } from '@teczone/shared';
import { useState, type FormEvent } from 'react';
import { api, ApiError } from '@/lib/api';
import { formatDateTime, toLocalInput } from '@/lib/format';
import { ACTIVITY_LABELS, type Activity } from '@/lib/leads';
import { Button, Card, Input, Select, Textarea } from './ui';

// Actividades y próxima acción de un lead u oportunidad (FR-08, FR-09).
export function Activities({
  basePath,
  activities,
  hasNextAction,
  active,
  editable,
  onChanged,
  onError,
}: {
  basePath: string;
  activities: Activity[];
  hasNextAction: boolean;
  active: boolean;
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
      await api(`${basePath}/activities`, {
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
      await api(`${basePath}/activities/${a.id}/toggle`, { method: 'POST' });
      onChanged();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'No se pudo actualizar la tarea');
    }
  }

  return (
    <Card title="Actividades y próxima acción">
      {active && !hasNextAction && (
        <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          No hay próxima acción. Programa una tarea con fecha para no perder el seguimiento.
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
      {activities.length === 0 ? (
        <p className="text-sm text-slate-500">Sin actividades.</p>
      ) : (
        <ul className="space-y-3">
          {activities.map((a) => (
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
