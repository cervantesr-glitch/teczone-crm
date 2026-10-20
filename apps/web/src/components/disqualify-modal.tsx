'use client';

import { useState } from 'react';
import { useCatalog } from '@/lib/use-catalogs';
import { Button, ErrorText, Field, Modal, Select, Textarea } from './ui';

export function DisqualifyModal({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: (reasonId: string, notes: string) => Promise<void>;
}) {
  const reasons = useCatalog('disqualification-reasons');
  const [reasonId, setReasonId] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!reasonId || !notes.trim()) {
      setError('Indica el motivo y las notas');
      return;
    }
    setSaving(true);
    try {
      await onConfirm(reasonId, notes.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo descalificar');
      setSaving(false);
    }
  }

  return (
    <Modal title="Descalificar lead" onClose={onCancel}>
      <div className="space-y-3">
        <Field label="Motivo">
          <Select value={reasonId} onChange={(e) => setReasonId(e.target.value)}>
            <option value="">Elige un motivo</option>
            {reasons.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Notas">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <ErrorText>{error}</ErrorText>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={submit} disabled={saving}>
            Descalificar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
