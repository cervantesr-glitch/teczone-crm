'use client';

import { ROLE_LABELS, ROLES, type Role } from '@teczone/shared';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Badge, Button, Card, ErrorText, Field, Input, Modal } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { isAdmin } from '@/lib/permissions';
import { useSession } from '@/lib/session';

interface UserRow {
  id: string;
  email: string;
  name: string;
  active: boolean;
  lastLoginAt: string | null;
  roles: Role[];
}

export default function UsersPage() {
  const me = useSession();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<UserRow | 'new' | null>(null);

  const load = useCallback(() => {
    api<UserRow[]>('/users')
      .then(setUsers)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'No se pudieron cargar los usuarios'));
  }, []);

  useEffect(load, [load]);

  if (!isAdmin(me)) return <ErrorText>Solo el administrador gestiona usuarios.</ErrorText>;

  async function toggleActive(u: UserRow) {
    try {
      await api(`/users/${u.id}`, { method: 'PATCH', body: JSON.stringify({ active: !u.active }) });
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo actualizar');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Usuarios</h1>
        <Button onClick={() => setEditing('new')}>Nuevo usuario</Button>
      </div>
      <ErrorText>{error}</ErrorText>
      <Card>
        <ul className="divide-y divide-slate-100">
          {users.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <div className="font-medium">
                  {u.name} {!u.active && <Badge className="bg-slate-200 text-slate-600">Inactivo</Badge>}
                </div>
                <div className="text-sm text-slate-500">{u.email}</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {u.roles.map((r) => (
                    <Badge key={r} className="bg-sky-50 text-sky-800">
                      {ROLE_LABELS[r]}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-xs text-slate-500">Último acceso: {formatDateTime(u.lastLoginAt)}</span>
                <Button variant="secondary" onClick={() => setEditing(u)}>
                  Editar
                </Button>
                {u.id !== me?.id && (
                  <Button variant="ghost" onClick={() => toggleActive(u)}>
                    {u.active ? 'Desactivar' : 'Activar'}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card>
      {editing && (
        <UserModal
          user={editing === 'new' ? null : editing}
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

function UserModal({ user, onClose, onSaved }: { user: UserRow | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [roles, setRoles] = useState<Role[]>(user?.roles ?? []);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      if (user) {
        await api(`/users/${user.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ name, roles, ...(password ? { password } : {}) }),
        });
      } else {
        await api('/users', { method: 'POST', body: JSON.stringify({ name, email, password, roles }) });
      }
      onSaved();
    } catch (err) {
      if (err instanceof ApiError && err.errors?.length) setError(err.errors.map((x) => x.message).join('. '));
      else setError(err instanceof ApiError ? err.message : 'No se pudo guardar');
    }
  }

  return (
    <Modal title={user ? 'Editar usuario' : 'Nuevo usuario'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Nombre">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Correo">
          <Input type="email" value={email} disabled={!!user} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label={user ? 'Nueva contraseña (opcional)' : 'Contraseña'} hint="Mínimo 10 caracteres, con letras y números">
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        </Field>
        <fieldset>
          <legend className="text-sm font-medium">Roles</legend>
          <div className="mt-1 grid grid-cols-2 gap-1">
            {ROLES.map((r) => (
              <label key={r} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={roles.includes(r)}
                  onChange={(e) => setRoles(e.target.checked ? [...roles, r] : roles.filter((x) => x !== r))}
                />
                {ROLE_LABELS[r]}
              </label>
            ))}
          </div>
        </fieldset>
        <ErrorText>{error}</ErrorText>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Guardar</Button>
        </div>
      </form>
    </Modal>
  );
}
