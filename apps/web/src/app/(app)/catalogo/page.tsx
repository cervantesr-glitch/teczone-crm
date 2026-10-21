'use client';

import { CURRENCIES, PRODUCT_CATEGORIES, type CompanySettings, type QuoteSettings } from '@teczone/shared';
import { useCallback, useEffect, useState } from 'react';
import { Button, Card, ErrorText, Field, Input, Modal, Select, Textarea } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { CATEGORY_LABELS } from '@/lib/leads';
import { canApproveQuotes, canWriteProducts } from '@/lib/permissions';
import type { Product } from '@/lib/quotes';
import { useSession } from '@/lib/session';

const errorMessage = (e: unknown, fallback: string) =>
  e instanceof ApiError ? e.errors?.map((x) => x.message).join('. ') || e.message : fallback;

// Catálogo de productos y servicios para cotizar (FR-03) y parámetros de cotización (NFR-08).
export default function CatalogPage() {
  const user = useSession();
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [items, setItems] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Product | 'new' | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ active: showInactive ? 'all' : 'true' });
    if (q) params.set('q', q);
    if (category) params.set('category', category);
    try {
      setItems(await api<Product[]>(`/products?${params}`));
      setError(null);
    } catch (e) {
      setError(errorMessage(e, 'No se pudo cargar el catálogo'));
    }
  }, [q, category, showInactive]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const writable = canWriteProducts(user);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Catálogo</h1>
        {writable && <Button onClick={() => setEditing('new')}>Nuevo producto</Button>}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-48 flex-1">
          <Input placeholder="Buscar por nombre, SKU o marca" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar" />
        </div>
        <Select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Categoría" className="w-auto">
          <option value="">Todas las categorías</option>
          {PRODUCT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </Select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          Incluir inactivos
        </label>
      </div>

      <ErrorText>{error}</ErrorText>

      {items &&
        (items.length ? (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">SKU</th>
                  <th className="px-3 py-2">Producto</th>
                  <th className="px-3 py-2">Categoría</th>
                  <th className="px-3 py-2 text-right">Costo</th>
                  <th className="px-3 py-2 text-right">Precio de lista</th>
                  <th className="px-3 py-2 text-right">Margen</th>
                  {writable && <th className="px-3 py-2" />}
                </tr>
              </thead>
              <tbody>
                {items.map((p) => {
                  const price = Number(p.listPrice);
                  const margin = price > 0 ? ((price - Number(p.unitCost)) / price) * 100 : 0;
                  return (
                    <tr key={p.id} className={`border-b border-slate-100 last:border-0 ${p.active ? '' : 'text-slate-400'}`}>
                      <td className="px-3 py-2 font-mono text-xs">{p.sku ?? '—'}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium">{p.name}</div>
                        <div className="text-slate-500">{[p.brand, p.unit, !p.active && 'inactivo'].filter(Boolean).join(' · ')}</div>
                      </td>
                      <td className="px-3 py-2">{CATEGORY_LABELS[p.category]}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-right">{formatMoney(p.unitCost, p.currency)}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-right">{formatMoney(p.listPrice, p.currency)}</td>
                      <td className="px-3 py-2 text-right">{margin.toFixed(1)}%</td>
                      {writable && (
                        <td className="px-3 py-2 text-right">
                          <Button variant="ghost" onClick={() => setEditing(p)}>
                            Editar
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
            No hay productos{q || category ? ' con estos filtros' : ''}. También puedes cotizar partidas libres.
          </p>
        ))}

      {canApproveQuotes(user) && <QuoteSettingsCard />}
      {canApproveQuotes(user) && <CompanySettingsCard />}

      {editing && (
        <ProductModal
          product={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function ProductModal({ product, onClose, onSaved }: { product: Product | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    sku: product?.sku ?? '',
    name: product?.name ?? '',
    brand: product?.brand ?? '',
    category: product?.category ?? 'HARDWARE',
    unit: product?.unit ?? 'pieza',
    unitCost: product?.unitCost ?? '',
    listPrice: product?.listPrice ?? '',
    currency: product?.currency ?? 'MXN',
    active: product?.active ?? true,
  });
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  async function save() {
    try {
      const body = {
        ...form,
        sku: form.sku || null,
        brand: form.brand || null,
        unitCost: Number(form.unitCost),
        listPrice: Number(form.listPrice),
      };
      await api(product ? `/products/${product.id}` : '/products', {
        method: product ? 'PATCH' : 'POST',
        body: JSON.stringify(body),
      });
      onSaved();
    } catch (e) {
      setError(errorMessage(e, 'No se pudo guardar el producto'));
    }
  }

  return (
    <Modal title={product ? 'Editar producto' : 'Nuevo producto'} onClose={onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="SKU">
            <Input value={form.sku} onChange={set('sku')} />
          </Field>
          <Field label="Marca">
            <Input value={form.brand} onChange={set('brand')} />
          </Field>
        </div>
        <Field label="Nombre *">
          <Input value={form.name} onChange={set('name')} autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoría">
            <Select value={form.category} onChange={set('category')}>
              {PRODUCT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Unidad">
            <Input value={form.unit} onChange={set('unit')} />
          </Field>
          <Field label="Costo *">
            <Input type="number" min={0} step="0.01" value={form.unitCost} onChange={set('unitCost')} />
          </Field>
          <Field label="Precio de lista *">
            <Input type="number" min={0} step="0.01" value={form.listPrice} onChange={set('listPrice')} />
          </Field>
          <Field label="Moneda">
            <Select value={form.currency} onChange={set('currency')}>
              {CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
        </div>
        {product && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
            Activo (disponible para cotizar)
          </label>
        )}
        <ErrorText>{error}</ErrorText>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={!form.name.trim() || form.unitCost === '' || form.listPrice === ''}>
            Guardar
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function QuoteSettingsCard() {
  const [form, setForm] = useState<QuoteSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api<QuoteSettings>('/settings/quotes').then(setForm).catch((e) => setError(errorMessage(e, 'No se pudieron cargar los parámetros')));
  }, []);

  if (!form) return error ? <ErrorText>{error}</ErrorText> : null;

  const num = (k: 'minMarginPct' | 'validityDays' | 'taxRate' | 'usdExchangeRate') => (e: { target: { value: string } }) => {
    setSaved(false);
    setForm({ ...form, [k]: Number(e.target.value) });
  };

  async function save() {
    try {
      setForm(await api<QuoteSettings>('/settings/quotes', { method: 'PUT', body: JSON.stringify(form) }));
      setError(null);
      setSaved(true);
    } catch (e) {
      setError(errorMessage(e, 'No se pudieron guardar los parámetros'));
    }
  }

  return (
    <Card title="Parámetros de cotización">
      <p className="mb-3 text-sm text-slate-500">Aplican a cotizaciones y versiones nuevas; las existentes conservan los valores con que se crearon.</p>
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="Margen mínimo (%)" hint="Debajo de este margen se pide autorización">
          <Input type="number" min={0} max={100} step="0.5" value={form.minMarginPct} onChange={num('minMarginPct')} />
        </Field>
        <Field label="Vigencia (días)">
          <Input type="number" min={1} value={form.validityDays} onChange={num('validityDays')} />
        </Field>
        <Field label="IVA (%)">
          <Input type="number" min={0} max={100} value={form.taxRate} onChange={num('taxRate')} />
        </Field>
        <Field label="TC de referencia (MXN por USD)">
          <Input type="number" min={0} step="0.01" value={form.usdExchangeRate} onChange={num('usdExchangeRate')} />
        </Field>
      </div>
      <div className="mt-3">
        <Field label="Términos y condiciones">
          <Textarea
            rows={5}
            value={form.terms}
            onChange={(e) => {
              setSaved(false);
              setForm({ ...form, terms: e.target.value });
            }}
          />
        </Field>
      </div>
      <ErrorText>{error}</ErrorText>
      <div className="mt-3 flex items-center justify-end gap-3">
        {saved && <span className="text-sm text-emerald-700">Guardado</span>}
        <Button onClick={save}>Guardar parámetros</Button>
      </div>
    </Card>
  );
}

const COMPANY_FIELDS: [keyof CompanySettings, string][] = [
  ['name', 'Nombre comercial *'],
  ['legalName', 'Razón social'],
  ['rfc', 'RFC'],
  ['address', 'Dirección'],
  ['phone', 'Teléfono'],
  ['email', 'Correo'],
  ['website', 'Sitio web'],
];

// Datos del emisor en el encabezado del PDF de cotización (FR-06).
function CompanySettingsCard() {
  const [form, setForm] = useState<CompanySettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api<CompanySettings>('/settings/company').then(setForm).catch((e) => setError(errorMessage(e, 'No se pudieron cargar los datos de la empresa')));
  }, []);

  if (!form) return error ? <ErrorText>{error}</ErrorText> : null;

  async function save() {
    try {
      setForm(await api<CompanySettings>('/settings/company', { method: 'PUT', body: JSON.stringify(form) }));
      setError(null);
      setSaved(true);
    } catch (e) {
      setError(errorMessage(e, 'No se pudieron guardar los datos de la empresa'));
    }
  }

  return (
    <Card title="Datos de la empresa para el PDF">
      <div className="grid gap-3 sm:grid-cols-2">
        {COMPANY_FIELDS.map(([k, label]) => (
          <Field key={k} label={label}>
            <Input
              value={form[k]}
              onChange={(e) => {
                setSaved(false);
                setForm({ ...form, [k]: e.target.value });
              }}
            />
          </Field>
        ))}
      </div>
      <ErrorText>{error}</ErrorText>
      <div className="mt-3 flex items-center justify-end gap-3">
        {saved && <span className="text-sm text-emerald-700">Guardado</span>}
        <Button onClick={save} disabled={!form.name.trim()}>
          Guardar datos
        </Button>
      </div>
    </Card>
  );
}
