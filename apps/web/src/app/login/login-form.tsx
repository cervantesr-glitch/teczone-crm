'use client';

import { loginSchema } from '@teczone/shared';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { ErrorText, Spinner } from '@/components/ui';
import { api, ApiError } from '@/lib/api';

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const parsed = loginSchema.safeParse({ email: form.get('email'), password: form.get('password') });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    try {
      await api('/auth/login', { method: 'POST', body: JSON.stringify(parsed.data) });
      const next = params.get('next');
      router.replace(next?.startsWith('/') ? next : '/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-5" noValidate>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700">
          Correo
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          placeholder="nombre@teczone.mx"
          required
          className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 shadow-xs transition placeholder:text-slate-400 focus:border-brand focus:ring-3 focus:ring-brand/15 focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-700">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 shadow-xs transition placeholder:text-slate-400 focus:border-brand focus:ring-3 focus:ring-brand/15 focus:outline-none"
        />
      </div>
      <ErrorText>{error}</ErrorText>
      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 font-medium text-white shadow-sm transition hover:bg-brand-dark focus-visible:ring-3 focus-visible:ring-brand/30 focus-visible:outline-none disabled:opacity-60"
      >
        {loading && <Spinner className="size-4" />}
        {loading ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  );
}
