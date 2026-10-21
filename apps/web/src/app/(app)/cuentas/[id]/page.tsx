'use client';

import { DECISION_ROLE_LABELS } from '@teczone/shared';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ContactFields, contactPayload, type ContactFormValues } from '@/components/contact-fields';
import { StageBadge } from '@/components/stage-badge';
import { Badge, Button, Card, ErrorText, Field, Input, LoadingPage, Textarea } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import type { AccountDetail } from '@/lib/crm';
import { formatDate, formatMoney } from '@/lib/format';
import { canSeeOpportunities, canWriteAccounts } from '@/lib/permissions';
import { useSession } from '@/lib/session';

const ACCOUNT_FIELDS = [
  ['name', 'Nombre *'],
  ['legalName', 'Razón social'],
  ['rfc', 'RFC'],
  ['industry', 'Industria'],
  ['companySize', 'Tamaño'],
  ['phone', 'Teléfono'],
  ['website', 'Sitio web'],
  ['city', 'Ciudad'],
  ['state', 'Estado'],
] as const;

type AccountForm = Record<(typeof ACCOUNT_FIELDS)[number][0] | 'notes', string>;

const emptyContact: ContactFormValues = { name: '', title: '', email: '', phone: '', decisionRole: '' };

const errorMessage = (e: unknown, fallback: string) =>
  e instanceof ApiError ? e.errors?.map((x) => x.message).join('. ') || e.message : fallback;

export default function AccountPage() {
  const { id } = useParams<{ id: string }>();
  const user = useSession();
  const [account, setAccount] = useState<AccountDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<AccountForm | null>(null);
  const [newContact, setNewContact] = useState<ContactFormValues | null>(null);

  const load = useCallback(async () => {
    try {
      setAccount(await api<AccountDetail>(`/accounts/${id}`));
    } catch (e) {
      setError(errorMessage(e, 'No se pudo cargar la cuenta'));
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!account) return error ? <ErrorText>{error}</ErrorText> : <LoadingPage />;

  const writable = canWriteAccounts(user);

  function startEdit() {
    const a = account!;
    setEditing({
      name: a.name,
      legalName: a.legalName ?? '',
      rfc: a.rfc ?? '',
      industry: a.industry ?? '',
      companySize: a.companySize ?? '',
      phone: a.phone ?? '',
      website: a.website ?? '',
      city: a.city ?? '',
      state: a.state ?? '',
      notes: a.notes ?? '',
    });
  }

  async function saveAccount() {
    if (!editing) return;
    try {
      const body = Object.fromEntries(Object.entries(editing).map(([k, v]) => [k, k === 'name' ? v : v || null]));
      await api(`/accounts/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
      setEditing(null);
      setError(null);
      await load();
    } catch (e) {
      setError(errorMessage(e, 'No se pudo guardar la cuenta'));
    }
  }

  async function addContact() {
    if (!newContact) return;
    try {
      await api(`/accounts/${id}/contacts`, { method: 'POST', body: JSON.stringify(contactPayload(newContact)) });
      setNewContact(null);
      setError(null);
      await load();
    } catch (e) {
      setError(errorMessage(e, 'No se pudo agregar el contacto'));
    }
  }

  async function makePrimary(contactId: string) {
    try {
      await api(`/accounts/${id}/contacts/${contactId}`, { method: 'PATCH', body: JSON.stringify({ isPrimary: true }) });
      await load();
    } catch (e) {
      setError(errorMessage(e, 'No se pudo actualizar el contacto'));
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Link href="/cuentas" className="inline-flex items-center gap-1 text-sm text-slate-500 transition hover:text-brand">
          ← Cuentas
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{account.name}</h1>
        <p className="text-sm text-slate-500">
          {[account.legalName, account.rfc].filter(Boolean).join(' · ') || 'Sin datos fiscales'}
          {account.owner && ` · Responsable: ${account.owner.name}`}
        </p>
      </div>

      <ErrorText>{error}</ErrorText>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {canSeeOpportunities(user) && (
            <Card title="Oportunidades">
              {account.opportunities.length ? (
                <ul className="divide-y divide-slate-100">
                  {account.opportunities.map((o) => (
                    <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                      <div>
                        <Link href={`/oportunidades/${o.id}`} className="font-medium text-slate-900 hover:text-brand">
                          <span className="font-mono text-xs text-slate-500">{o.folio}</span> {o.name}
                        </Link>
                        <div className="text-slate-500">
                          {o.owner.name} · cierre {formatDate(o.expectedCloseDate)}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span>{formatMoney(o.amount, o.currency)}</span>
                        <StageBadge stage={o.stage} />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">Sin oportunidades visibles para ti.</p>
              )}
            </Card>
          )}

          <Card
            title="Contactos"
            actions={
              writable &&
              !newContact && (
                <Button variant="ghost" onClick={() => setNewContact(emptyContact)}>
                  Agregar contacto
                </Button>
              )
            }
          >
            {newContact && (
              <div className="mb-4 space-y-3 rounded-md border border-slate-200 p-3">
                <ContactFields value={newContact} onChange={setNewContact} />
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" onClick={() => setNewContact(null)}>
                    Cancelar
                  </Button>
                  <Button onClick={addContact} disabled={!newContact.name.trim()}>
                    Guardar contacto
                  </Button>
                </div>
              </div>
            )}
            {account.contacts.length ? (
              <ul className="divide-y divide-slate-100">
                {account.contacts.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-start justify-between gap-2 py-2 text-sm">
                    <div>
                      <div className="font-medium">
                        {c.name} {c.isPrimary && <Badge className="bg-sky-100 text-sky-800">Principal</Badge>}
                      </div>
                      <div className="text-slate-500">
                        {[c.title, c.decisionRole && DECISION_ROLE_LABELS[c.decisionRole]].filter(Boolean).join(' · ')}
                      </div>
                      <div className="text-slate-500">{[c.email, c.phone].filter(Boolean).join(' · ')}</div>
                    </div>
                    {writable && !c.isPrimary && (
                      <Button variant="ghost" onClick={() => makePrimary(c.id)}>
                        Hacer principal
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">Sin contactos.</p>
            )}
          </Card>
        </div>

        <Card
          title="Datos de la cuenta"
          actions={
            writable &&
            !editing && (
              <Button variant="ghost" onClick={startEdit}>
                Editar
              </Button>
            )
          }
        >
          {editing ? (
            <div className="space-y-3">
              {ACCOUNT_FIELDS.map(([k, label]) => (
                <Field key={k} label={label}>
                  <Input value={editing[k]} onChange={(e) => setEditing({ ...editing, [k]: e.target.value })} />
                </Field>
              ))}
              <Field label="Notas">
                <Textarea value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
              </Field>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setEditing(null)}>
                  Cancelar
                </Button>
                <Button onClick={saveAccount} disabled={!editing.name.trim()}>
                  Guardar
                </Button>
              </div>
            </div>
          ) : (
            <dl className="space-y-2 text-sm">
              {ACCOUNT_FIELDS.slice(1).map(([k, label]) => (
                <div key={k}>
                  <dt className="text-slate-500">{label}</dt>
                  <dd>{account[k] || '—'}</dd>
                </div>
              ))}
              {account.notes && (
                <div>
                  <dt className="text-slate-500">Notas</dt>
                  <dd className="whitespace-pre-wrap">{account.notes}</dd>
                </div>
              )}
            </dl>
          )}
        </Card>
      </div>
    </div>
  );
}
