'use client';

import { LEAD_STATUS_LABELS } from '@teczone/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { emptyLeadForm, formToPayload, LeadForm, type LeadFormValues } from '@/components/lead-form';
import { Button, Card } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import type { Duplicate, LeadDetail } from '@/lib/leads';
import { canAssignLeads, isSeller } from '@/lib/permissions';
import { useSession } from '@/lib/session';

export default function NewLeadPage() {
  const router = useRouter();
  const user = useSession();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [duplicates, setDuplicates] = useState<{ values: LeadFormValues; items: Duplicate[] } | null>(null);
  // Conserva lo capturado al volver de la revisión de duplicados.
  const [draft, setDraft] = useState<LeadFormValues | null>(null);
  const showOwner = canAssignLeads(user);

  async function save(values: LeadFormValues, confirmDuplicate = false) {
    setError(null);
    setFieldErrors({});
    setDraft(values);
    try {
      const lead = await api<LeadDetail>('/leads', {
        method: 'POST',
        body: JSON.stringify({ ...formToPayload(values), confirmDuplicate }),
      });
      router.push(`/leads/${lead.id}`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && e.body?.duplicates) {
        setDuplicates({ values, items: e.body.duplicates as Duplicate[] });
        return;
      }
      if (e instanceof ApiError && e.errors) {
        setFieldErrors(Object.fromEntries(e.errors.map((x) => [x.field, x.message])));
      }
      setError(e instanceof ApiError ? e.message : 'No se pudo guardar');
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <Link href="/leads" className="text-sm text-brand hover:underline">
          ← Leads
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Nuevo lead</h1>
      </div>

      {duplicates ? (
        <Card title="Posibles duplicados">
          <p className="mb-3 text-sm text-slate-600">
            Encontramos leads parecidos. Revísalos antes de guardar para no duplicar el seguimiento.
          </p>
          <ul className="mb-4 divide-y divide-slate-100 rounded-md border border-slate-200">
            {duplicates.items.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                <div>
                  <Link href={`/leads/${d.id}`} className="font-medium text-brand hover:underline" target="_blank">
                    {d.folio} · {d.companyName}
                  </Link>
                  <div className="text-slate-500">
                    {d.contactName} · {LEAD_STATUS_LABELS[d.status]} · {d.ownerName ?? 'Sin asignar'}
                  </div>
                </div>
                <span className="text-xs text-amber-700">Coincide en {d.matchedOn.join(', ')}</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDuplicates(null)}>
              Volver a editar
            </Button>
            <Button onClick={() => save(duplicates.values, true)}>Guardar de todos modos</Button>
          </div>
        </Card>
      ) : (
        <Card>
          <LeadForm
            initial={draft ?? { ...emptyLeadForm(), ...(showOwner ? { ownerId: isSeller(user) ? (user?.id ?? '') : '' } : {}) }}
            submitLabel="Guardar lead"
            showOwner={showOwner}
            onSubmit={(v) => save(v)}
            onCancel={() => router.push('/leads')}
            fieldErrors={fieldErrors}
            error={error}
          />
        </Card>
      )}
    </div>
  );
}
