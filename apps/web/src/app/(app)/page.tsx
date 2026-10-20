'use client';

import { useSession } from '@/lib/session';

export default function HomePage() {
  const user = useSession();
  return (
    <div>
      <h1 className="text-2xl font-semibold">Hola, {user?.name}</h1>
      <p className="mt-2 text-slate-600">
        Te damos la bienvenida al CRM de TecZone. Empieza por el módulo de leads; cotizaciones y contratos de servicio llegan en las siguientes entregas.
      </p>
    </div>
  );
}
