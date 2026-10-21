'use client';

import { CURRENCIES, LEAD_INTEREST_LABELS, LEAD_INTEREST_TYPES, PRODUCT_CATEGORIES } from '@teczone/shared';
import { useState, type FormEvent } from 'react';
import { CATEGORY_LABELS, type LeadDetail } from '@/lib/leads';
import { useCatalog } from '@/lib/use-catalogs';
import { Button, ErrorText, Field, Input, Select, Textarea } from './ui';

export interface LeadFormValues {
  companyName: string;
  contactName: string;
  contactTitle: string;
  email: string;
  phone: string;
  whatsapp: string;
  rfc: string;
  industry: string;
  companySize: string;
  city: string;
  state: string;
  need: string;
  interestType: string;
  sourceId: string;
  ownerId?: string;
  estimatedBudget: string;
  currency: string;
  expectedPurchaseDate: string;
  productsOfInterest: { category: string; description: string; quantity: string }[];
}

export function emptyLeadForm(): LeadFormValues {
  return {
    companyName: '',
    contactName: '',
    contactTitle: '',
    email: '',
    phone: '',
    whatsapp: '',
    rfc: '',
    industry: '',
    companySize: '',
    city: '',
    state: '',
    need: '',
    interestType: 'POR_DEFINIR',
    sourceId: '',
    estimatedBudget: '',
    currency: 'MXN',
    expectedPurchaseDate: '',
    productsOfInterest: [],
  };
}

export function leadToForm(l: LeadDetail): LeadFormValues {
  return {
    companyName: l.companyName,
    contactName: l.contactName,
    contactTitle: l.contactTitle ?? '',
    email: l.email ?? '',
    phone: l.phone ?? '',
    whatsapp: l.whatsapp ?? '',
    rfc: l.rfc ?? '',
    industry: l.industry ?? '',
    companySize: l.companySize ?? '',
    city: l.city ?? '',
    state: l.state ?? '',
    need: l.need ?? '',
    interestType: l.interestType,
    sourceId: l.source.id,
    estimatedBudget: l.estimatedBudget ?? '',
    currency: l.currency ?? 'MXN',
    expectedPurchaseDate: l.expectedPurchaseDate ? l.expectedPurchaseDate.slice(0, 10) : '',
    productsOfInterest: l.productsOfInterest.map((p) => ({
      category: p.category,
      description: p.description,
      quantity: p.quantity ? String(p.quantity) : '',
    })),
  };
}

// Convierte el formulario al cuerpo que espera la API.
export function formToPayload(v: LeadFormValues) {
  return {
    companyName: v.companyName,
    contactName: v.contactName,
    contactTitle: v.contactTitle || null,
    email: v.email || null,
    phone: v.phone || null,
    whatsapp: v.whatsapp || null,
    rfc: v.rfc || null,
    industry: v.industry || null,
    companySize: v.companySize || null,
    city: v.city || null,
    state: v.state || null,
    need: v.need || null,
    interestType: v.interestType,
    sourceId: v.sourceId,
    ...(v.ownerId !== undefined ? { ownerId: v.ownerId || null } : {}),
    estimatedBudget: v.estimatedBudget ? Number(v.estimatedBudget) : null,
    currency: v.estimatedBudget ? v.currency : null,
    expectedPurchaseDate: v.expectedPurchaseDate || null,
    productsOfInterest: v.productsOfInterest
      .filter((p) => p.description.trim())
      .map((p) => ({ category: p.category, description: p.description, quantity: p.quantity ? Number(p.quantity) : null })),
  };
}

export function LeadForm({
  initial,
  submitLabel,
  showOwner,
  onSubmit,
  onCancel,
  fieldErrors = {},
  error,
}: {
  initial: LeadFormValues;
  submitLabel: string;
  showOwner?: boolean;
  onSubmit: (values: LeadFormValues) => Promise<void>;
  onCancel?: () => void;
  fieldErrors?: Record<string, string>;
  error?: string | null;
}) {
  const sources = useCatalog('lead-sources');
  const sellers = useCatalog('sellers');
  const [v, setV] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [more, setMore] = useState(false);

  const set = (key: keyof LeadFormValues) => (e: { target: { value: string } }) => setV({ ...v, [key]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit(v);
    } finally {
      setSaving(false);
    }
  }

  const products = v.productsOfInterest;
  const setProduct = (i: number, key: 'category' | 'description' | 'quantity', value: string) =>
    setV({ ...v, productsOfInterest: products.map((p, j) => (j === i ? { ...p, [key]: value } : p)) });

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Empresa *" error={fieldErrors.companyName}>
          <Input value={v.companyName} onChange={set('companyName')} autoFocus />
        </Field>
        <Field label="Contacto *" error={fieldErrors.contactName}>
          <Input value={v.contactName} onChange={set('contactName')} />
        </Field>
        <Field label="Correo" error={fieldErrors.email} hint="Correo o teléfono es obligatorio">
          <Input type="email" value={v.email} onChange={set('email')} />
        </Field>
        <Field label="Teléfono" error={fieldErrors.phone}>
          <Input type="tel" value={v.phone} onChange={set('phone')} />
        </Field>
        <Field label="Fuente *" error={fieldErrors.sourceId}>
          <Select value={v.sourceId} onChange={set('sourceId')}>
            <option value="">Elige la fuente</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Interés">
          <Select value={v.interestType} onChange={set('interestType')}>
            {LEAD_INTEREST_TYPES.map((t) => (
              <option key={t} value={t}>
                {LEAD_INTEREST_LABELS[t]}
              </option>
            ))}
          </Select>
        </Field>
        {showOwner && (
          <Field label="Responsable">
            <Select value={v.ownerId ?? ''} onChange={set('ownerId')}>
              <option value="">Sin asignar</option>
              {sellers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </div>
      <Field label="¿Qué necesita?">
        <Textarea value={v.need} onChange={set('need')} />
      </Field>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium">Productos o servicios de interés</span>
          <Button
            variant="ghost"
            onClick={() => setV({ ...v, productsOfInterest: [...products, { category: 'HARDWARE', description: '', quantity: '' }] })}
          >
            + Agregar
          </Button>
        </div>
        {products.map((p, i) => (
          <div key={i} className="mb-2 flex gap-2">
            <Select value={p.category} onChange={(e) => setProduct(i, 'category', e.target.value)} className="w-36" aria-label="Categoría">
              {PRODUCT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </Select>
            <Input value={p.description} onChange={(e) => setProduct(i, 'description', e.target.value)} placeholder="Descripción" aria-label="Descripción" />
            <Input value={p.quantity} onChange={(e) => setProduct(i, 'quantity', e.target.value)} placeholder="Cant." aria-label="Cantidad" type="number" min={1} className="w-24" />
            <Button variant="ghost" aria-label="Quitar" onClick={() => setV({ ...v, productsOfInterest: products.filter((_, j) => j !== i) })}>
              ✕
            </Button>
          </div>
        ))}
      </div>

      <button type="button" className="text-sm link" onClick={() => setMore(!more)}>
        {more ? 'Ocultar datos adicionales' : 'Más datos (puesto, RFC, presupuesto, ubicación…)'}
      </button>
      {more && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Puesto">
            <Input value={v.contactTitle} onChange={set('contactTitle')} />
          </Field>
          <Field label="WhatsApp">
            <Input type="tel" value={v.whatsapp} onChange={set('whatsapp')} />
          </Field>
          <Field label="RFC" error={fieldErrors.rfc}>
            <Input value={v.rfc} onChange={set('rfc')} />
          </Field>
          <Field label="Industria">
            <Input value={v.industry} onChange={set('industry')} />
          </Field>
          <Field label="Tamaño de empresa">
            <Input value={v.companySize} onChange={set('companySize')} placeholder="Ej. 11 a 50 empleados" />
          </Field>
          <Field label="Ciudad">
            <Input value={v.city} onChange={set('city')} />
          </Field>
          <Field label="Estado">
            <Input value={v.state} onChange={set('state')} />
          </Field>
          <Field label="Fecha estimada de compra">
            <Input type="date" value={v.expectedPurchaseDate} onChange={set('expectedPurchaseDate')} />
          </Field>
          <Field label="Presupuesto estimado">
            <div className="flex gap-2">
              <Input type="number" min={0} value={v.estimatedBudget} onChange={set('estimatedBudget')} />
              <Select value={v.currency} onChange={set('currency')} className="w-24" aria-label="Moneda">
                {CURRENCIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </div>
          </Field>
        </div>
      )}

      <ErrorText>{error}</ErrorText>
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={saving}>
          {saving ? 'Guardando…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
