import { BarChart3, FileText, ShieldCheck } from 'lucide-react';
import { Suspense } from 'react';
import globo from '@/assets/globo.png';
import logo from '@/assets/logo.png';
import { LoginForm } from './login-form';

const HIGHLIGHTS = [
  { icon: BarChart3, text: 'Da seguimiento a leads y oportunidades en un solo lugar' },
  { icon: FileText, text: 'Cotiza con márgenes y autorizaciones claras' },
  { icon: ShieldCheck, text: 'Acceso por rol para cada integrante del equipo' },
];

export default function LoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-brand-950 via-brand-900 to-brand-700 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -bottom-32 size-[520px] rounded-full bg-[radial-gradient(circle,rgba(95,142,246,0.35),transparent_65%)]"
        />
        <div className="relative flex items-center gap-3">
          <img src={globo.src} alt="" className="size-10" />
          <span className="text-2xl font-bold tracking-tight">
            Tec<span className="text-slate-300">Zone</span>
          </span>
        </div>
        <div className="relative max-w-md">
          <h2 className="text-4xl leading-tight font-semibold tracking-tight">Tu gestión comercial, más clara y más rápida.</h2>
          <ul className="mt-8 space-y-4">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-slate-200">
                <span className="grid size-9 place-items-center rounded-lg bg-white/10 ring-1 ring-white/15">
                  <Icon className="size-[18px]" aria-hidden />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-slate-400">Hardware, software y servicios especializados en tecnología.</p>
      </section>

      <section className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <img src={logo.src} alt="TecZone" className="mx-auto h-24 w-auto lg:hidden" />
          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-slate-900 lg:mt-0">Te damos la bienvenida</h1>
          <p className="mt-1 text-sm text-slate-500">Inicia sesión con tu cuenta de TecZone CRM</p>
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
