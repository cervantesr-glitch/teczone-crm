'use client';

import { PIPELINE_LABELS, PIPELINES, type Pipeline } from '@teczone/shared';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import type { Contact } from '@/lib/crm';
import { isManager } from '@/lib/permissions';
import { useSession } from '@/lib/session';
import { useCatalog } from '@/lib/use-catalogs';
import { Button, ErrorText, Field, Input, Modal, Select } from './ui';

// Oportunidad nueva para un cliente que ya es cuenta, sin pasar por un lead.
export function NewOpportunityModal({
  accountId,
  accountName,
  contacts,
  onClose,
}: {
  accountId: string;
  accountName: string;
  contacts: Contact[];
  onClose: () => void;
}) {
  const router = useRouter();
  const user = useSession();
  const manager = isManager(user);
  const sellers = useCatalog('sellers');
  const [form, setForm] = useState({
    name: '',
    pipeline: 'PYME' as Pipeline,
    primaryContactId: contacts.find((c) => c.isPrimary)?.id ?? '',
    amount: '',
    currency: 'MXN',
    expectedCloseDate: '',
    ownerId: user?.id ?? '',
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const opp = await api<{ id: string }>('/opportunities', {
        method: 'POST',
        body: JSON.stringify({
          accountId,
          name: form.name,
          pipeline: form.pipeline,
          primaryContactId: form.primaryContactId || null,
          amount: form.amount ? Number(form.amount) : null,
          currency: form.amount ? form.currency : null,
          expectedCloseDate: form.expectedCloseDate || null,
          ...(manager && form.ownerId ? { ownerId: form.ownerId } : {}),
        }),
      });
      router.push(`/oportunidades/${opp.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.errors?.map((x) => x.message).join('. ') || e.message : 'No se pudo crear la oportunidad');
      setSaving(false);
    }
  }

  return (
    <Modal title={`Nueva oportunidad · ${accountName}`} onClose={onClose}>
      <div className="space-y-3">
        <Field label="Nombre *" hint="Ej. Renovación de licencias 2027">
          <Input value={form.name} onChange={set('name')} autoFocus />
        </Field>
        <Field label="Pipeline">
          <Select value={form.pipeline} onChange={set('pipeline')}>
            {PIPELINES.map((p) => (
              <option key={p} value={p}>
                {PIPELINE_LABELS[p]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Contacto principal">
          <Select value={form.primaryContactId} onChange={set('primaryContactId')}>
            <option value="">Sin contacto</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.title ? ` · ${c.title}` : ''}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Monto estimado">
            <div className="flex gap-2">
              <Input type="number" min={0} value={form.amount} onChange={set('amount')} />
              <Select value={form.currency} onChange={set('currency')} className="w-28 shrink-0" aria-label="Moneda">
                <option>MXN</option>
                <option>USD</option>
              </Select>
            </div>
          </Field>
          <Field label="Cierre estimado">
            <Input type="date" value={form.expectedCloseDate} onChange={set('expectedCloseDate')} />
          </Field>
        </div>
        {manager && (
          <Field label="Responsable">
            <Select value={form.ownerId} onChange={set('ownerId')}>
              {user && <option value={user.id}>{user.name} (yo)</option>}
              {sellers
                .filter((s) => s.id !== user?.id)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </Select>
          </Field>
        )}
        <ErrorText>{error}</ErrorText>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving || !form.name.trim()}>
            Crear oportunidad
          </Button>
        </div>
      </div>
    </Modal>
  );
}
