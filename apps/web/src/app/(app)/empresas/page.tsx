'use client';

import { COMPANY_LOGO_MAX_BYTES, ROLE_LABELS, TAX_REGIMES } from '@teczone/shared';
import { Building, ImagePlus, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Card, EmptyState, ErrorText, Field, Input, LoadingTable, Modal, PageHeader, Select, Textarea } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import type { Company, CompanyAssignment } from '@/lib/companies';
import { canManageCompanies } from '@/lib/permissions';
import { useSession } from '@/lib/session';

const errorMessage = (e: unknown, fallback: string) =>
  e instanceof ApiError ? e.errors?.map((x) => x.message).join('. ') || e.message : fallback;

const logoUrl = (c: Company) => `/api/companies/${c.id}/logo?v=${encodeURIComponent(c.updatedAt)}`;

// Empresas con las que se cotiza: perfil fiscal, logo y empresa asignada a cada vendedor (FR-06).
export default function CompaniesPage() {
  const user = useSession();
  const [companies, setCompanies] = useState<Company[] | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Company | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Company | null>(null);

  const load = useCallback(async () => {
    try {
      setCompanies(await api<Company[]>(`/companies?includeInactive=${showInactive}`));
      setError(null);
    } catch (e) {
      setError(errorMessage(e, 'No se pudieron cargar las empresas'));
    }
  }, [showInactive]);

  useEffect(() => {
    load();
  }, [load]);

  if (!canManageCompanies(user)) return <ErrorText>Solo la gerencia comercial administra las empresas.</ErrorText>;

  async function toggleActive(c: Company) {
    try {
      await api(`/companies/${c.id}`, { method: 'PATCH', body: JSON.stringify({ active: !c.active }) });
      load();
    } catch (e) {
      setError(errorMessage(e, 'No se pudo actualizar la empresa'));
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Empresas"
        description="Empresas con las que se cotiza. Su razón social, datos fiscales y logo se imprimen en el PDF."
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus className="size-4" /> Nueva empresa
          </Button>
        }
      />

      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" className="size-4 rounded accent-brand" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
        Incluir inactivas
      </label>

      <ErrorText>{error}</ErrorText>

      {!companies && !error && <LoadingTable rows={3} />}
      {companies &&
        (companies.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {companies.map((c) => (
              <CompanyCard
                key={c.id}
                company={c}
                onEdit={() => setEditing(c)}
                onToggle={() => toggleActive(c)}
                onDelete={() => setDeleting(c)}
              />
            ))}
          </div>
        ) : (
          <EmptyState title="Aún no hay empresas" icon={Building}>
            Da de alta la primera empresa para poder cotizar.
          </EmptyState>
        ))}

      {companies && <AssignmentsCard companies={companies.filter((c) => c.active)} onChanged={load} />}

      {editing && (
        <CompanyModal
          company={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
      {deleting && (
        <DeleteModal
          company={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={() => {
            setDeleting(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function CompanyLogo({ company, className = 'size-14' }: { company: Company; className?: string }) {
  return company.hasLogo ? (
    <img src={logoUrl(company)} alt="" className={`${className} shrink-0 rounded-lg border border-slate-200 bg-white object-contain p-1`} />
  ) : (
    <span className={`${className} grid shrink-0 place-items-center rounded-lg bg-brand-50 text-brand`}>
      <Building className="size-6" aria-hidden />
    </span>
  );
}

function CompanyCard({
  company: c,
  onEdit,
  onToggle,
  onDelete,
}: {
  company: Company;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const incomplete = !c.rfc || !c.legalName;
  return (
    <Card>
      <div className={`flex gap-4 ${c.active ? '' : 'opacity-60'}`}>
        <CompanyLogo company={c} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-slate-900">{c.name}</h2>
            {!c.active && <Badge className="bg-slate-200 text-slate-600">Inactiva</Badge>}
            {incomplete && <Badge className="bg-amber-100 text-amber-800">Faltan datos fiscales</Badge>}
          </div>
          <div className="text-sm text-slate-600">{c.legalName}</div>
          <div className="mt-1 text-sm text-slate-500">
            {[c.rfc && `RFC ${c.rfc}`, c.taxRegime].filter(Boolean).join(' · ') || 'Sin RFC'}
          </div>
          {(c.address || c.postalCode) && (
            <div className="text-sm text-slate-500">{[c.address, c.postalCode && `C.P. ${c.postalCode}`].filter(Boolean).join(', ')}</div>
          )}
          <div className="mt-2 text-xs text-slate-500">
            {c.quoteCount} cotizaci{c.quoteCount === 1 ? 'ón' : 'ones'} · {c.userCount} usuario{c.userCount === 1 ? '' : 's'} la
            tiene{c.userCount === 1 ? '' : 'n'} asignada
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-3">
        {c.quoteCount > 0 && <span className="mr-auto text-xs text-slate-500">Con cotizaciones: no se puede eliminar</span>}
        {c.quoteCount === 0 && (
          <Button variant="ghost" className="mr-auto !text-red-600 hover:!bg-red-50" onClick={onDelete}>
            <Trash2 className="size-4" /> Eliminar
          </Button>
        )}
        <Button variant="ghost" onClick={onToggle}>
          {c.active ? 'Desactivar' : 'Activar'}
        </Button>
        <Button variant="secondary" onClick={onEdit}>
          Editar
        </Button>
      </div>
    </Card>
  );
}

type Form = Record<'name' | 'legalName' | 'rfc' | 'taxRegime' | 'postalCode' | 'address' | 'phone' | 'email' | 'website', string>;

function CompanyModal({ company, onClose, onSaved }: { company: Company | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Form>({
    name: company?.name ?? '',
    legalName: company?.legalName ?? '',
    rfc: company?.rfc ?? '',
    taxRegime: company?.taxRegime ?? '',
    postalCode: company?.postalCode ?? '',
    address: company?.address ?? '',
    phone: company?.phone ?? '',
    email: company?.email ?? '',
    website: company?.website ?? '',
  });
  // undefined: sin cambios; null: quitar; texto: nuevo logo en data URL.
  const [logo, setLogo] = useState<string | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof Form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  const preview = logo ?? (logo === undefined && company?.hasLogo ? logoUrl(company) : null);

  function pickLogo(file: File | undefined) {
    if (!file) return;
    if (!['image/png', 'image/jpeg'].includes(file.type)) return setError('El logo debe ser PNG o JPG');
    if (file.size > COMPANY_LOGO_MAX_BYTES) return setError('El logo debe pesar menos de 1 MB');
    const reader = new FileReader();
    reader.onload = () => {
      setLogo(String(reader.result));
      setError(null);
    };
    reader.readAsDataURL(file);
  }

  async function save() {
    setBusy(true);
    try {
      const saved = await api<{ id: string }>(company ? `/companies/${company.id}` : '/companies', {
        method: company ? 'PATCH' : 'POST',
        body: JSON.stringify(form),
      });
      if (logo) await api(`/companies/${saved.id}/logo`, { method: 'PUT', body: JSON.stringify({ dataUrl: logo }) });
      if (logo === null && company?.hasLogo) await api(`/companies/${saved.id}/logo`, { method: 'DELETE' });
      onSaved();
    } catch (e) {
      setError(errorMessage(e, 'No se pudo guardar la empresa'));
    } finally {
      setBusy(false);
    }
  }

  const section = 'text-xs font-semibold uppercase tracking-wide text-slate-500';

  return (
    <Modal
      size="lg"
      title={company ? `Editar ${company.name}` : 'Nueva empresa'}
      description="Estos datos aparecen en el encabezado del PDF de cotización."
      onClose={onClose}
    >
      <div className="space-y-5">
        <div className="flex items-center gap-4">
          {preview ? (
            <img src={preview} alt="Logo" className="size-20 rounded-lg border border-slate-200 bg-white object-contain p-1" />
          ) : (
            <span className="grid size-20 place-items-center rounded-lg border border-dashed border-slate-300 text-slate-400">
              <ImagePlus className="size-6" aria-hidden />
            </span>
          )}
          <div className="space-y-1 text-sm">
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50">
              <ImagePlus className="size-4" aria-hidden />
              {preview ? 'Cambiar logo' : 'Subir logo'}
              <input type="file" accept="image/png,image/jpeg" className="sr-only" onChange={(e) => pickLogo(e.target.files?.[0])} />
            </label>
            {preview && (
              <button type="button" className="ml-2 text-slate-500 hover:text-red-600" onClick={() => setLogo(null)}>
                Quitar
              </button>
            )}
            <p className="text-xs text-slate-500">PNG o JPG de hasta 1 MB. Sin logo se usa el de TecZone.</p>
          </div>
        </div>

        <fieldset className="space-y-3">
          <legend className={section}>Identificación fiscal</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nombre comercial *">
              <Input value={form.name} onChange={set('name')} autoFocus />
            </Field>
            <Field label="Razón social *">
              <Input value={form.legalName} onChange={set('legalName')} />
            </Field>
            <Field label="RFC *" hint="12 caracteres (moral) o 13 (física)">
              <Input value={form.rfc} onChange={(e) => setForm({ ...form, rfc: e.target.value.toUpperCase() })} maxLength={13} className="font-mono uppercase" />
            </Field>
            <Field label="Régimen fiscal">
              <Select value={form.taxRegime} onChange={set('taxRegime')}>
                <option value="">Sin especificar</option>
                {form.taxRegime && !(TAX_REGIMES as readonly string[]).includes(form.taxRegime) && <option>{form.taxRegime}</option>}
                {TAX_REGIMES.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </Select>
            </Field>
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className={section}>Domicilio fiscal</legend>
          <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
            <Field label="Dirección">
              <Textarea rows={2} value={form.address} onChange={set('address')} placeholder="Calle, número, colonia, ciudad y estado" />
            </Field>
            <Field label="Código postal">
              <Input value={form.postalCode} onChange={set('postalCode')} inputMode="numeric" maxLength={5} />
            </Field>
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className={section}>Contacto</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Teléfono">
              <Input value={form.phone} onChange={set('phone')} />
            </Field>
            <Field label="Correo">
              <Input type="email" value={form.email} onChange={set('email')} />
            </Field>
            <Field label="Sitio web">
              <Input value={form.website} onChange={set('website')} />
            </Field>
          </div>
        </fieldset>

        <ErrorText>{error}</ErrorText>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={busy || !form.name.trim() || !form.legalName.trim() || !form.rfc.trim()}>
            Guardar empresa
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function DeleteModal({ company, onClose, onDeleted }: { company: Company; onClose: () => void; onDeleted: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function remove() {
    setBusy(true);
    try {
      await api(`/companies/${company.id}`, { method: 'DELETE' });
      onDeleted();
    } catch (e) {
      setError(errorMessage(e, 'No se pudo eliminar la empresa'));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={`Eliminar ${company.name}`} onClose={onClose}>
      <div className="space-y-3 text-sm">
        <p>No tiene cotizaciones, así que se puede eliminar. Esta acción no se puede deshacer.</p>
        <ErrorText>{error}</ErrorText>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={remove} disabled={busy}>
            Eliminar empresa
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// Empresa con la que cotiza cada vendedor por omisión.
function AssignmentsCard({ companies, onChanged }: { companies: Company[]; onChanged: () => void }) {
  const [rows, setRows] = useState<CompanyAssignment[] | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<CompanyAssignment[]>('/companies/assignments')
      .then(setRows)
      .catch((e) => setError(errorMessage(e, 'No se pudieron cargar los vendedores')));
  }, []);

  async function assign(u: CompanyAssignment, companyId: string) {
    try {
      await api(`/companies/assignments/${u.id}`, { method: 'PUT', body: JSON.stringify({ companyId: companyId || null }) });
      setRows((r) => r?.map((x) => (x.id === u.id ? { ...x, defaultCompanyId: companyId || null } : x)) ?? null);
      setSaved(u.id);
      setError(null);
      onChanged();
    } catch (e) {
      setError(errorMessage(e, 'No se pudo asignar la empresa'));
    }
  }

  return (
    <Card title="Empresa por vendedor">
      <p className="mb-3 text-sm text-slate-500">
        Cada ejecutivo cotiza con la empresa que tiene asignada. La gerencia puede elegir otra al cotizar.
      </p>
      <ErrorText>{error}</ErrorText>
      {!rows && !error && <LoadingTable rows={3} />}
      {rows && (
        <ul className="divide-y divide-slate-100">
          {rows.map((u) => {
            const inactive = u.defaultCompanyId && !companies.some((c) => c.id === u.defaultCompanyId);
            return (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <div className="font-medium">{u.name}</div>
                  <div className="text-xs text-slate-500">{u.roles.map((r) => ROLE_LABELS[r]).join(' · ')}</div>
                </div>
                <div className="flex items-center gap-2">
                  {saved === u.id && <span className="text-xs text-emerald-700">Guardado</span>}
                  <Select
                    className="w-64"
                    value={u.defaultCompanyId ?? ''}
                    onChange={(e) => assign(u, e.target.value)}
                    aria-label={`Empresa de ${u.name}`}
                  >
                    <option value="">Sin asignar (primera activa)</option>
                    {inactive && <option value={u.defaultCompanyId!}>Empresa inactiva</option>}
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
