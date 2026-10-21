'use client';

import { PIPELINE_LABELS, PIPELINES, type Pipeline } from '@teczone/shared';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ContactFields, contactPayload, type ContactFormValues } from '@/components/contact-fields';
import { Button, Card, ErrorText, Field, Input, LoadingPage, Select } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import type { AccountDetail, AccountListItem } from '@/lib/crm';
import type { LeadDetail } from '@/lib/leads';

// Asistente de conversión del lead calificado (FR-25).
export default function ConvertLeadPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Cuenta
  const [accountMode, setAccountMode] = useState<'new' | 'existing'>('new');
  const [accountSearch, setAccountSearch] = useState('');
  const [accountMatches, setAccountMatches] = useState<AccountListItem[]>([]);
  const [account, setAccount] = useState<AccountDetail | null>(null);
  const [newAccount, setNewAccount] = useState({ name: '', rfc: '', industry: '', city: '', state: '' });

  // Contacto
  const [contactMode, setContactMode] = useState<'new' | 'existing'>('new');
  const [contactId, setContactId] = useState('');
  const [newContact, setNewContact] = useState<ContactFormValues>({ name: '', title: '', email: '', phone: '', decisionRole: '' });

  // Oportunidad
  const [pipeline, setPipeline] = useState<Pipeline>('PYME');
  const [oppName, setOppName] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('MXN');
  const [closeDate, setCloseDate] = useState('');

  useEffect(() => {
    api<LeadDetail>(`/leads/${id}`).then((l) => {
      setLead(l);
      setNewAccount({ name: l.companyName, rfc: l.rfc ?? '', industry: l.industry ?? '', city: l.city ?? '', state: l.state ?? '' });
      setNewContact({ name: l.contactName, title: l.contactTitle ?? '', email: l.email ?? '', phone: l.phone ?? '', decisionRole: '' });
      setPipeline(l.interestType === 'SOLUCIONES' ? 'SOLUCIONES' : 'PYME');
      setOppName(`${l.companyName}${l.need ? ` · ${l.need.slice(0, 60)}` : ''}`);
      setAmount(l.estimatedBudget ?? '');
      setCurrency(l.currency ?? 'MXN');
      setCloseDate(l.expectedPurchaseDate?.slice(0, 10) ?? '');
      setAccountSearch(l.companyName);
    });
  }, [id]);

  // Busca cuentas parecidas para no duplicar clientes.
  useEffect(() => {
    if (accountSearch.trim().length < 2) {
      setAccountMatches([]);
      return;
    }
    const t = setTimeout(() => {
      api<{ items: AccountListItem[] }>(`/accounts?q=${encodeURIComponent(accountSearch.trim())}&pageSize=10`)
        .then((r) => setAccountMatches(r.items))
        .catch(() => setAccountMatches([]));
    }, 250);
    return () => clearTimeout(t);
  }, [accountSearch]);

  async function pickAccount(accountId: string) {
    const a = await api<AccountDetail>(`/accounts/${accountId}`);
    setAccount(a);
    setAccountMode('existing');
    const sameEmail = a.contacts.find((c) => c.email && c.email === lead?.email);
    if (sameEmail) {
      setContactMode('existing');
      setContactId(sameEmail.id);
    }
  }

  async function submit() {
    setError(null);
    if (accountMode === 'existing' && !account) return setError('Elige la cuenta existente');
    if (contactMode === 'existing' && !contactId) return setError('Elige el contacto existente');
    setSaving(true);
    try {
      const res = await api<{ opportunityId: string }>(`/leads/${id}/convert`, {
        method: 'POST',
        body: JSON.stringify({
          account:
            accountMode === 'existing'
              ? { mode: 'existing', accountId: account!.id }
              : {
                  mode: 'new',
                  data: {
                    name: newAccount.name,
                    rfc: newAccount.rfc || null,
                    industry: newAccount.industry || null,
                    city: newAccount.city || null,
                    state: newAccount.state || null,
                  },
                },
          contact:
            contactMode === 'existing'
              ? { mode: 'existing', contactId }
              : { mode: 'new', data: { ...contactPayload(newContact), isPrimary: true } },
          opportunity: {
            pipeline,
            name: oppName,
            amount: amount ? Number(amount) : null,
            currency: amount ? currency : null,
            expectedCloseDate: closeDate || null,
          },
        }),
      });
      router.push(`/oportunidades/${res.opportunityId}`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && typeof e.body?.accountId === 'string') {
        setError(`${e.message}. Elígela como cuenta existente.`);
        await pickAccount(e.body.accountId);
      } else if (e instanceof ApiError && e.errors?.length) {
        setError(e.errors.map((x) => x.message).join('. '));
      } else {
        setError(e instanceof ApiError ? e.message : 'No se pudo convertir el lead');
      }
    } finally {
      setSaving(false);
    }
  }

  if (!lead) return <LoadingPage />;
  if (lead.status !== 'CALIFICADO') {
    return <ErrorText>Solo un lead calificado se puede convertir. Este lead está en otro estado.</ErrorText>;
  }

  const tab = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-sm ${active ? 'bg-brand text-white' : 'border border-slate-300 bg-white hover:bg-slate-50'}`;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <Link href={`/leads/${id}`} className="inline-flex items-center gap-1 text-sm text-slate-500 transition hover:text-brand">
          ← {lead.folio} · {lead.companyName}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Convertir lead</h1>
        <p className="text-sm text-slate-500">
          Se crea la oportunidad y el lead queda como historial de solo consulta.
        </p>
      </div>

      <Card title="1. Cuenta">
        <div className="mb-3 flex gap-2">
          <button className={tab(accountMode === 'new')} onClick={() => { setAccountMode('new'); setContactMode('new'); }}>
            Cuenta nueva
          </button>
          <button className={tab(accountMode === 'existing')} onClick={() => setAccountMode('existing')}>
            Cuenta existente
          </button>
        </div>
        {accountMatches.length > 0 && accountMode === 'new' && (
          <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Ya hay {accountMatches.length === 1 ? 'una cuenta parecida' : `${accountMatches.length} cuentas parecidas`}:{' '}
            {accountMatches.slice(0, 3).map((a, i) => (
              <span key={a.id}>
                {i > 0 && ', '}
                <button className="font-medium underline" onClick={() => pickAccount(a.id)}>
                  {a.name}
                </button>
              </span>
            ))}
            . Elige una si es el mismo cliente.
          </p>
        )}
        {accountMode === 'new' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nombre *">
              <Input value={newAccount.name} onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })} />
            </Field>
            <Field label="RFC">
              <Input value={newAccount.rfc} onChange={(e) => setNewAccount({ ...newAccount, rfc: e.target.value })} />
            </Field>
            <Field label="Industria">
              <Input value={newAccount.industry} onChange={(e) => setNewAccount({ ...newAccount, industry: e.target.value })} />
            </Field>
            <Field label="Ciudad">
              <Input value={newAccount.city} onChange={(e) => setNewAccount({ ...newAccount, city: e.target.value })} />
            </Field>
          </div>
        ) : (
          <div className="space-y-2">
            <Input placeholder="Buscar cuenta por nombre o RFC" value={accountSearch} onChange={(e) => setAccountSearch(e.target.value)} aria-label="Buscar cuenta" />
            <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
              {accountMatches.map((a) => (
                <li key={a.id}>
                  <button
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${account?.id === a.id ? 'bg-sky-50 font-medium' : ''}`}
                    onClick={() => pickAccount(a.id)}
                  >
                    {a.name} {a.rfc && <span className="text-slate-500">· {a.rfc}</span>}
                  </button>
                </li>
              ))}
              {accountMatches.length === 0 && <li className="px-3 py-2 text-sm text-slate-500">Sin resultados</li>}
            </ul>
          </div>
        )}
      </Card>

      <Card title="2. Contacto">
        <div className="mb-3 flex gap-2">
          <button className={tab(contactMode === 'new')} onClick={() => setContactMode('new')}>
            Contacto nuevo
          </button>
          <button
            className={tab(contactMode === 'existing')}
            disabled={accountMode === 'new' || !account?.contacts.length}
            onClick={() => setContactMode('existing')}
          >
            Contacto de la cuenta
          </button>
        </div>
        {contactMode === 'new' ? (
          <ContactFields value={newContact} onChange={setNewContact} />
        ) : (
          <Select value={contactId} onChange={(e) => setContactId(e.target.value)} aria-label="Contacto">
            <option value="">Elige el contacto</option>
            {account?.contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.title ? ` · ${c.title}` : ''}
              </option>
            ))}
          </Select>
        )}
      </Card>

      <Card title="3. Oportunidad">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Pipeline">
            <Select value={pipeline} onChange={(e) => setPipeline(e.target.value as Pipeline)}>
              {PIPELINES.map((p) => (
                <option key={p} value={p}>
                  {PIPELINE_LABELS[p]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Nombre *">
            <Input value={oppName} onChange={(e) => setOppName(e.target.value)} />
          </Field>
          <Field label="Monto estimado">
            <div className="flex gap-2">
              <Input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} />
              <Select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-24" aria-label="Moneda">
                <option>MXN</option>
                <option>USD</option>
              </Select>
            </div>
          </Field>
          <Field label="Cierre estimado">
            <Input type="date" value={closeDate} onChange={(e) => setCloseDate(e.target.value)} />
          </Field>
        </div>
      </Card>

      <ErrorText>{error}</ErrorText>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => router.push(`/leads/${id}`)}>
          Cancelar
        </Button>
        <Button onClick={submit} disabled={saving}>
          {saving ? 'Convirtiendo…' : 'Convertir lead'}
        </Button>
      </div>
    </div>
  );
}
