import { Suspense } from 'react';
import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-brand">TecZone CRM</h1>
        <p className="mt-1 text-sm text-slate-500">Inicia sesión con tu cuenta</p>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
