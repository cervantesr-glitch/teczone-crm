'use client';

import { Building2, Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  EmptyState,
  ErrorText,
  Field,
  Input,
  LoadingTable,
  Modal,
  PageHeader,
  Spinner,
  Toolbar,
  MobileCard,
} from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import type { AccountListItem } from '@/lib/crm';
import { canWriteAccounts } from '@/lib/permissions';
import { useSession } from '@/lib/session';

interface ListResponse {
  total: number;
  items: AccountListItem[];
}

export default function AccountsPage() {
  const user = useSession();
  const [q, setQ] = useState('');
  const [data, setData] = useState<ListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ pageSize: '200' });
    if (q) params.set('q', q);
    try {
      setData(await api<ListResponse>(`/accounts?${params}`));
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudieron cargar las cuentas');
    }
  }, [q]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Cuentas"
        description="Empresas cliente con sus contactos y oportunidades."
        actions={
          canWriteAccounts(user) && (
            <Button onClick={() => setCreating(true)}>
              <Plus className="size-4" /> Nueva cuenta
            </Button>
          )
        }
      />

      <Toolbar>
        <div className="relative w-full">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <Input
            className="pl-9"
            placeholder="Buscar por nombre, razón social o RFC"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Buscar"
          />
        </div>
      </Toolbar>
      <ErrorText>{error}</ErrorText>

      {!data && !error && <LoadingTable />}
      {data &&
        (data.items.length ? (
          <>
            <ul className="space-y-2 md:hidden">
              {data.items.map((a) => (
                <MobileCard
                  key={a.id}
                  href={`/cuentas/${a.id}`}
                  title={a.name}
                  subtitle={[a.industry, [a.city, a.state].filter(Boolean).join(', ')].filter(Boolean).join(' · ') || undefined}
                  meta={
                    <>
                      <span>{a._count.contacts} contactos</span>
                      <span>{a._count.opportunities} oportunidades</span>
                      {a.owner && <span>{a.owner.name}</span>}
                    </>
                  }
                />
              ))}
            </ul>
            <div className="table-card hidden md:block">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="table-head">
                  <tr>
                    <th className="px-4 py-2.5">Cuenta</th>
                    <th className="px-4 py-2.5">RFC</th>
                    <th className="px-4 py-2.5">Industria</th>
                    <th className="px-4 py-2.5">Ubicación</th>
                    <th className="px-4 py-2.5">Responsable</th>
                    <th className="px-4 py-2.5 text-right">Contactos</th>
                    <th className="px-4 py-2.5 text-right">Oportunidades</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((a) => (
                    <tr key={a.id} className="table-row">
                      <td className="px-4 py-3">
                        <Link href={`/cuentas/${a.id}`} className="font-medium text-slate-900 hover:text-brand">
                          {a.name}
                        </Link>
                        {a.legalName && <div className="text-slate-500">{a.legalName}</div>}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{a.rfc ?? '—'}</td>
                      <td className="px-4 py-3">{a.industry ?? '—'}</td>
                      <td className="px-4 py-3">{[a.city, a.state].filter(Boolean).join(', ') || '—'}</td>
                      <td className="px-4 py-3">{a.owner?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-right">{a._count.contacts}</td>
                      <td className="px-4 py-3 text-right">{a._count.opportunities}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="table-foot">{data.total} cuentas</p>
            </div>
          </>
        ) : (
          <EmptyState title={q ? 'No hay cuentas con esa búsqueda' : 'Aún no hay cuentas'} icon={Building2}>
            Se crean al convertir un lead o con “Nueva cuenta”.
          </EmptyState>
        ))}

      {creating && <NewAccountModal onClose={() => setCreating(false)} />}
    </div>
  );
}

function NewAccountModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', rfc: '', industry: '', city: '' });
  const [error, setError] = useState<string | null>(null);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  async function save() {
    setSaving(true);
    setError(null);
    setExistingId(null);
    try {
      const a = await api<{ id: string }>('/accounts', {
        method: 'POST',
        body: JSON.stringify({ name: form.name, rfc: form.rfc || null, industry: form.industry || null, city: form.city || null }),
      });
      router.push(`/cuentas/${a.id}`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && typeof e.body?.accountId === 'string') setExistingId(e.body.accountId);
      setError(e instanceof ApiError ? e.errors?.map((x) => x.message).join('. ') || e.message : 'No se pudo crear la cuenta');
      setSaving(false);
    }
  }

  return (
    <Modal title="Nueva cuenta" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Nombre *">
          <Input value={form.name} onChange={set('name')} autoFocus />
        </Field>
        <Field label="RFC">
          <Input value={form.rfc} onChange={set('rfc')} />
        </Field>
        <Field label="Industria">
          <Input value={form.industry} onChange={set('industry')} />
        </Field>
        <Field label="Ciudad">
          <Input value={form.city} onChange={set('city')} />
        </Field>
        <ErrorText>{error}</ErrorText>
        {existingId && (
          <Link href={`/cuentas/${existingId}`} className="block text-sm link">
            Ver la cuenta existente →
          </Link>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving || !form.name.trim()}>
            {saving && <Spinner className="size-4" />}
            Crear cuenta
          </Button>
        </div>
      </div>
    </Modal>
  );
}
