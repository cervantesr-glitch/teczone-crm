'use client';

import { useSession } from '@/lib/session';

export default function HomePage() {
  const user = useSession();
  return (
    <div>
      <h1 className="text-2xl font-semibold">Hola, {user?.name}</h1>
      <p className="mt-2 text-slate-600">
        Esta es la base del CRM. El módulo de leads es el siguiente en construirse.
      </p>
    </div>
  );
}
