'use client';

import { AlertCircle, Inbox, Loader2, X, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import {
  useEffect,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';

const inputClass =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-xs transition placeholder:text-slate-400 hover:border-slate-400 focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';

export function Field({ label, error, children, hint }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint && !error && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
      {error && (
        <span className="mt-1 flex items-center gap-1 text-xs text-red-600">
          <AlertCircle className="size-3.5 shrink-0" aria-hidden />
          {error}
        </span>
      )}
    </label>
  );
}

// Ancho completo salvo que el llamador indique otro ancho (w-*).
function fieldClass(className?: string) {
  const width = /(^|\s)w-/.test(className ?? '') ? '' : 'w-full';
  return `${inputClass} ${width} ${className ?? ''}`;
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={fieldClass(props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={fieldClass(`pr-8 ${props.className ?? ''}`)} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={fieldClass(props.className)} />;
}

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
const variants: Record<Variant, string> = {
  primary: 'bg-brand text-white shadow-sm hover:bg-brand-dark focus-visible:ring-brand/30',
  secondary:
    'border border-slate-300 bg-white text-slate-700 shadow-xs hover:bg-slate-50 hover:border-slate-400 focus-visible:ring-slate-300/50',
  danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:ring-red-300/50',
  ghost: 'text-brand hover:bg-brand-50 focus-visible:ring-brand/20',
};
const buttonBase =
  'inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-3 disabled:pointer-events-none disabled:opacity-50';

export function Button({ variant = 'primary', className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type="button" {...props} className={`${buttonBase} ${variants[variant]} ${className ?? ''}`} />;
}

// Enlace con aspecto de botón (por ejemplo, "Nuevo lead").
export function ButtonLink({
  href,
  variant = 'primary',
  className,
  children,
}: {
  href: string;
  variant?: Variant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={`${buttonBase} ${variants[variant]} ${className ?? ''}`}>
      {children}
    </Link>
  );
}

export function Badge({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-black/5 ring-inset ${className ?? ''}`}
    >
      {children}
    </span>
  );
}

export function Card({
  title,
  actions,
  children,
  className,
}: {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-slate-200/80 bg-white p-5 shadow-card ${className ?? ''}`}>
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="text-base font-semibold text-slate-900">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

// Encabezado de cada pantalla: título, descripción breve y acciones a la derecha.
export function PageHeader({
  title,
  description,
  actions,
  back,
  eyebrow,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
  eyebrow?: ReactNode;
}) {
  return (
    <div className="space-y-2">
      {back && (
        <Link href={back.href} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand">
          ← {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && <div className="mb-1 text-xs font-medium text-slate-500">{eyebrow}</div>}
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
          {description && <div className="mt-1 text-sm text-slate-500">{description}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

// Barra de búsqueda y filtros sobre los listados.
export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200/80 bg-white p-2 shadow-card">{children}</div>;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'brand',
  hint,
  href,
}: {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  tone?: 'brand' | 'alert' | 'warn' | 'good' | 'neutral';
  hint?: ReactNode;
  href?: string;
}) {
  const tones = {
    brand: 'bg-brand-50 text-brand',
    alert: 'bg-red-50 text-red-600',
    warn: 'bg-amber-50 text-amber-600',
    good: 'bg-emerald-50 text-emerald-600',
    neutral: 'bg-slate-100 text-slate-500',
  };
  const body = (
    <div className="flex items-start gap-3">
      {Icon && (
        <span className={`hidden size-10 shrink-0 sm:grid place-items-center rounded-lg ${tones[tone]}`}>
          <Icon className="size-5" aria-hidden />
        </span>
      )}
      <div className="min-w-0">
        <div className="text-xs leading-tight font-medium text-slate-500 sm:truncate sm:text-sm">{label}</div>
        <div
          className={`mt-0.5 text-2xl font-semibold tracking-tight tabular-nums ${tone === 'alert' ? 'text-red-600' : 'text-slate-900'}`}
        >
          {value}
        </div>
        {hint && <div className="mt-0.5 text-xs text-slate-500">{hint}</div>}
      </div>
    </div>
  );
  const cls = 'block rounded-xl border border-slate-200/80 bg-white p-3 shadow-card sm:p-4';
  return href ? (
    <Link href={href} className={`${cls} transition hover:border-brand-200 hover:shadow-md`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function EmptyState({
  title,
  children,
  icon: Icon = Inbox,
  action,
}: {
  title?: string;
  children?: ReactNode;
  icon?: LucideIcon;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-brand-50 text-brand">
        <Icon className="size-6" aria-hidden />
      </span>
      {title && <p className="mt-3 font-medium text-slate-900">{title}</p>}
      {children && <div className="mt-1 max-w-md text-sm text-slate-500">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={`animate-spin ${className ?? 'size-5'}`} aria-hidden />;
}

// Esqueleto de carga para listados mientras llega la respuesta de la API.
export function LoadingTable({ rows = 6 }: { rows?: number }) {
  return (
    <div className="table-card p-4" aria-busy="true" aria-label="Cargando">
      <div className="mb-4 h-3 w-1/3 animate-pulse rounded bg-slate-200" />
      <div className="space-y-3">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
            <div className="h-3 flex-1 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
            <div className="hidden h-3 w-28 animate-pulse rounded bg-slate-100 sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function LoadingPage({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-24 text-sm text-slate-500" aria-busy="true">
      <Spinner />
      {label}
    </div>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[90vh] w-full max-w-md animate-pop-in overflow-y-auto rounded-2xl bg-white p-6 shadow-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="-m-1 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

// Fila de listado en formato tarjeta para pantallas angostas (las tablas se ocultan en móvil).
export function MobileCard({
  href,
  title,
  subtitle,
  badge,
  meta,
}: {
  href: string;
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <li>
      <Link href={href} className="block rounded-xl border border-slate-200/80 bg-white p-4 shadow-card transition active:bg-slate-50">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-medium text-slate-900">{title}</div>
            {subtitle && <div className="mt-0.5 text-sm text-slate-500">{subtitle}</div>}
          </div>
          {badge && <div className="shrink-0">{badge}</div>}
        </div>
        {meta && <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">{meta}</div>}
      </Link>
    </li>
  );
}
