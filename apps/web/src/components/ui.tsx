'use client';

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

const inputClass =
  'rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:bg-slate-100';

export function Field({ label, error, children, hint }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && !error && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
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
  return <select {...props} className={fieldClass(props.className)} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={fieldClass(props.className)} />;
}

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
const variants: Record<Variant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-dark',
  secondary: 'border border-slate-300 bg-white hover:bg-slate-50',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  ghost: 'text-brand hover:bg-slate-100',
};

export function Button({ variant = 'primary', className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center gap-1 rounded-md px-3 py-2 text-sm font-medium disabled:opacity-50 ${variants[variant]} ${className ?? ''}`}
    />
  );
}

export function Badge({ className, children }: { className?: string; children: ReactNode }) {
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${className ?? ''}`}>{children}</span>;
}

export function Card({ title, actions, children }: { title?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      {(title || actions) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="font-semibold">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-md rounded-lg bg-white p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
      {children}
    </p>
  );
}
