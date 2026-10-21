'use client';

import { ROLE_LABELS } from '@teczone/shared';
import {
  Building2,
  FileSignature,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Target,
  UserPlus,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import globo from '@/assets/globo.png';
import { LoadingPage } from '@/components/ui';
import { api } from '@/lib/api';
import { initials } from '@/lib/format';
import { canSeeAccounts, canSeeLeads, canSeeOpportunities, canSeeProducts, canSeeQuotes, isAdmin } from '@/lib/permissions';
import { SessionContext } from '@/lib/session';
import type { SessionUser } from '@/lib/types';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  ready: boolean;
  show?: (u: SessionUser) => boolean;
}

// Orden de entregas del BRD v1.1. Los módulos se activan conforme se construyen.
const NAV: { title?: string; items: NavItem[] }[] = [
  { items: [{ href: '/', label: 'Inicio', icon: LayoutDashboard, ready: true }] },
  {
    title: 'Ventas',
    items: [
      { href: '/leads', label: 'Leads', icon: UserPlus, ready: true, show: canSeeLeads },
      { href: '/oportunidades', label: 'Oportunidades', icon: Target, ready: true, show: canSeeOpportunities },
      { href: '/cotizaciones', label: 'Cotizaciones', icon: FileText, ready: true, show: canSeeQuotes },
    ],
  },
  {
    title: 'Clientes',
    items: [
      { href: '/cuentas', label: 'Cuentas', icon: Building2, ready: true, show: canSeeAccounts },
      { href: '/contratos', label: 'Contratos de servicio', icon: FileSignature, ready: false },
    ],
  },
  {
    title: 'Administración',
    items: [
      { href: '/catalogo', label: 'Catálogo', icon: Package, ready: true, show: canSeeProducts },
      { href: '/usuarios', label: 'Usuarios', icon: Users, ready: true, show: isAdmin },
    ],
  },
];

const isActive = (href: string, pathname: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    api<SessionUser>('/auth/me')
      .then(setUser)
      .catch(() => router.replace('/login'));
  }, [router]);

  // Cierra el menú móvil al navegar.
  useEffect(() => setMenuOpen(false), [pathname]);

  async function logout() {
    await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
    router.replace('/login');
  }

  if (!user) {
    return <LoadingPage label="Cargando tu sesión…" />;
  }

  const current = NAV.flatMap((g) => g.items).find((i) => isActive(i.href, pathname));

  const sidebar = (
    <div className="flex h-full flex-col bg-gradient-to-b from-brand-950 to-brand-900 text-slate-300">
      <Link href="/" className="flex items-center gap-2.5 px-5 py-5">
        <img src={globo.src} alt="" width={34} height={34} className="size-[34px]" />
        <span className="leading-tight">
          <span className="block text-lg font-bold tracking-tight">
            <span className="text-white">Tec</span>
            <span className="text-slate-300">Zone</span>
          </span>
          <span className="block text-[10px] font-semibold tracking-[0.2em] text-brand-300 uppercase">CRM comercial</span>
        </span>
      </Link>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-2" aria-label="Principal">
        {NAV.map((group, gi) => {
          const items = group.items.filter((item) => !item.show || item.show(user));
          if (!items.length) return null;
          return (
            <div key={gi}>
              {group.title && (
                <div className="mb-1.5 px-3 text-[11px] font-semibold tracking-wider text-slate-400/80 uppercase">{group.title}</div>
              )}
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const Icon = item.icon;
                  if (!item.ready) {
                    return (
                      <li key={item.href} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-500">
                        <Icon className="size-[18px]" aria-hidden />
                        <span className="flex-1 truncate">{item.label}</span>
                        <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-400">Pronto</span>
                      </li>
                    );
                  }
                  const active = isActive(item.href, pathname);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? 'page' : undefined}
                        className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                          active ? 'bg-white/12 text-white shadow-inner ring-1 ring-white/10' : 'hover:bg-white/6 hover:text-white'
                        }`}
                      >
                        <Icon
                          className={`size-[18px] ${active ? 'text-brand-300' : 'text-slate-400 group-hover:text-slate-200'}`}
                          aria-hidden
                        />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-500 text-sm font-semibold text-white">
            {initials(user.name)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-white">{user.name}</div>
            <div className="truncate text-xs text-slate-400" title={user.roles.map((r) => ROLE_LABELS[r]).join(', ')}>
              {user.roles.map((r) => ROLE_LABELS[r]).join(', ')}
            </div>
          </div>
          <button
            onClick={logout}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
            className="rounded-md p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <SessionContext.Provider value={user}>
      <div className="min-h-screen md:pl-64">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 md:block">{sidebar}</aside>

        {menuOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div className="absolute inset-0 animate-fade-in bg-slate-900/50" onClick={() => setMenuOpen(false)} />
            <aside className="absolute inset-y-0 left-0 w-72 max-w-[85%] animate-pop-in shadow-pop">
              <button
                onClick={() => setMenuOpen(false)}
                aria-label="Cerrar menú"
                className="absolute top-4 right-3 z-10 rounded-md p-1.5 text-slate-300 hover:bg-white/10"
              >
                <X className="size-5" />
              </button>
              {sidebar}
            </aside>
          </div>
        )}

        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200/80 bg-white/85 px-4 backdrop-blur md:px-8">
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menú"
            className="-ml-1 rounded-md p-1.5 text-slate-600 hover:bg-slate-100 md:hidden"
          >
            <Menu className="size-5" />
          </button>
          <img src={globo.src} alt="" width={24} height={24} className="size-6 md:hidden" />
          <div className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">{current?.label ?? 'TecZone CRM'}</div>
          <div className="hidden text-sm text-slate-500 sm:block">
            {new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Mexico_City' }).format(
              new Date(),
            )}
          </div>
          <span
            className="grid size-8 place-items-center rounded-full bg-brand-50 text-xs font-semibold text-brand md:hidden"
            title={user.name}
          >
            {initials(user.name)}
          </span>
        </header>

        <main className="mx-auto max-w-7xl animate-fade-in p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </SessionContext.Provider>
  );
}
