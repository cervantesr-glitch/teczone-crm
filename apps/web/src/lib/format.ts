const TZ = 'America/Mexico_City';

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone: TZ }).format(
    new Date(value),
  );
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeZone: TZ }).format(new Date(value));
}

export function formatMoney(value: string | number | null | undefined, currency: string | null | undefined) {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: currency ?? 'MXN' }).format(Number(value));
}

// Valor para <input type="datetime-local"> en hora local del navegador.
export function toLocalInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Iniciales para el avatar del usuario.
export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}
