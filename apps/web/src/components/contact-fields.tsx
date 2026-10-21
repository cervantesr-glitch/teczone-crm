'use client';

import { DECISION_ROLE_LABELS, DECISION_ROLES } from '@teczone/shared';
import { Field, Input, Select } from './ui';

export interface ContactFormValues {
  name: string;
  title: string;
  email: string;
  phone: string;
  decisionRole: string;
}

export const contactPayload = (v: ContactFormValues) => ({
  name: v.name,
  title: v.title || null,
  email: v.email || null,
  phone: v.phone || null,
  decisionRole: v.decisionRole || null,
});

export function ContactFields({ value, onChange }: { value: ContactFormValues; onChange: (v: ContactFormValues) => void }) {
  const set = (k: keyof ContactFormValues) => (e: { target: { value: string } }) => onChange({ ...value, [k]: e.target.value });
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Nombre *">
        <Input value={value.name} onChange={set('name')} />
      </Field>
      <Field label="Puesto">
        <Input value={value.title} onChange={set('title')} />
      </Field>
      <Field label="Correo">
        <Input type="email" value={value.email} onChange={set('email')} />
      </Field>
      <Field label="Teléfono">
        <Input type="tel" value={value.phone} onChange={set('phone')} />
      </Field>
      <Field label="Rol en la decisión de compra">
        <Select value={value.decisionRole} onChange={set('decisionRole')}>
          <option value="">Sin definir</option>
          {DECISION_ROLES.map((r) => (
            <option key={r} value={r}>
              {DECISION_ROLE_LABELS[r]}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  );
}
