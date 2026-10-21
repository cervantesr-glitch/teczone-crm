'use client';

import { ROLE_LABELS } from '@teczone/shared';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { canSeeAccounts, canSeeLeads, canSeeOpportunities, canSeeProducts, canSeeQuotes, isAdmin } from '@/lib/permissions';
import { SessionContext } from '@/lib/session';
import type { SessionUser } from '@/lib/types';

// Orden de entregas del BRD v1.1. Los módulos se activan conforme se construyen.
const NAV: { href: string; label: string; ready: boolean; show?: (u: SessionUser) => boolean }[] = [
  { href: '/', label: 'Inicio', ready: true },
  { href: '/leads', label: 'Leads', ready: true, show: canSeeLeads },
  { href: '/oportunidades', label: 'Oportunidades', ready: true, show: canSeeOpportunities },
  { href: '/cuentas', label: 'Cuentas', ready: true, show: canSeeAccounts },
  { href: '/cotizaciones', label: 'Cotizaciones', ready: true, show: canSeeQuotes },
  { href: '/catalogo', label: 'Catálogo', ready: true, show: canSeeProducts },
  { href: '/contratos', label: 'Contratos de servicio', ready: false },
  { href: '/usuarios', label: 'Usuarios', ready: true, show: isAdmin },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    api<SessionUser>('/auth/me').then(setUser).catch(() => router.replace('/login'));
  }, [router]);

  async function logout() {
    await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
    router.replace('/login');
  }

  if (!user) {
    return <p className="p-8 text-slate-500">Cargando…</p>;
  }

  return (
    <SessionContext.Provider value={user}>
      <div className="flex min-h-screen flex-col md:flex-row">
        <aside className="border-b border-slate-200 bg-white md:w-60 md:border-b-0 md:border-r">
          <div className="px-5 py-4 text-lg font-semibold text-brand">TecZone CRM</div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col">
            {NAV.filter((item) => !item.show || item.show(user)).map((item) =>
              item.ready ? (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`whitespace-nowrap rounded-md px-3 py-2 text-sm ${
                    (item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)) ? 'bg-brand text-white' : 'hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </Link>
              ) : (
                <span key={item.href} className="whitespace-nowrap px-3 py-2 text-sm text-slate-400">
                  {item.label}
                  <span className="block text-xs">Próximamente</span>
                </span>
              ),
            )}
          </nav>
        </aside>
        <div className="min-w-0 flex-1">
          <header className="flex items-center justify-end gap-4 border-b border-slate-200 bg-white px-6 py-3">
            <div className="text-right text-sm">
              <div className="font-medium">{user.name}</div>
              <div className="text-slate-500">{user.roles.map((r) => ROLE_LABELS[r]).join(', ')}</div>
            </div>
            <button onClick={logout} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100">
              Salir
            </button>
          </header>
          <main className="p-6">{children}</main>
        </div>
      </div>
    </SessionContext.Provider>
  );
}
