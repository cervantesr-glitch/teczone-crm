'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Button, ErrorText, Field, Input, Modal } from '@/components/ui';
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Cuentas</h1>
        {canWriteAccounts(user) && <Button onClick={() => setCreating(true)}>Nueva cuenta</Button>}
      </div>

      <Input placeholder="Buscar por nombre, razón social o RFC" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar" />
      <ErrorText>{error}</ErrorText>

      {data &&
        (data.items.length ? (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Cuenta</th>
                  <th className="px-3 py-2">RFC</th>
                  <th className="px-3 py-2">Industria</th>
                  <th className="px-3 py-2">Ubicación</th>
                  <th className="px-3 py-2">Responsable</th>
                  <th className="px-3 py-2 text-right">Contactos</th>
                  <th className="px-3 py-2 text-right">Oportunidades</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((a) => (
                  <tr key={a.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-3 py-2">
                      <Link href={`/cuentas/${a.id}`} className="font-medium hover:underline">
                        {a.name}
                      </Link>
                      {a.legalName && <div className="text-slate-500">{a.legalName}</div>}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{a.rfc ?? '—'}</td>
                    <td className="px-3 py-2">{a.industry ?? '—'}</td>
                    <td className="px-3 py-2">{[a.city, a.state].filter(Boolean).join(', ') || '—'}</td>
                    <td className="px-3 py-2">{a.owner?.name ?? '—'}</td>
                    <td className="px-3 py-2 text-right">{a._count.contacts}</td>
                    <td className="px-3 py-2 text-right">{a._count.opportunities}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="border-t border-slate-100 px-3 py-2 text-xs text-slate-500">{data.total} cuentas</p>
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
            No hay cuentas{q ? ' con esa búsqueda' : ''}. Se crean al convertir un lead o con “Nueva cuenta”.
          </p>
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
      setError(e instanceof ApiError ? (e.errors?.map((x) => x.message).join('. ') || e.message) : 'No se pudo crear la cuenta');
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
          <Link href={`/cuentas/${existingId}`} className="block text-sm text-brand hover:underline">
            Ver la cuenta existente →
          </Link>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving || !form.name.trim()}>
            Crear cuenta
          </Button>
        </div>
      </div>
    </Modal>
  );
}
