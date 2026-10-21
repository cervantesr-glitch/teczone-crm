// Manejo de fechas. Hay dos tipos y no deben mezclarse:
// - Fechas de solo día (vigencia, cierre estimado, fecha estimada de compra): columnas @db.Date
//   que llegan como medianoche UTC ("2026-11-05T00:00:00.000Z"). Se muestran con su día UTC;
//   convertirlas a la hora de México las recorre al día anterior.
// - Instantes (envío, cierre real, seguimientos): se muestran en la hora de Ciudad de México.

export const MX_TIME_ZONE = 'America/Mexico_City';

type DateInput = string | Date;
type DateStyle = 'medium' | 'long';

// Día calendario de una fecha de solo día, sin depender de la zona horaria del equipo.
export function formatDayOnly(value: DateInput, dateStyle: DateStyle = 'medium') {
  return new Intl.DateTimeFormat('es-MX', { dateStyle, timeZone: 'UTC' }).format(new Date(value));
}

// Fecha (sin hora) de un instante, según el día que era en Ciudad de México.
export function formatInstantDate(value: DateInput, dateStyle: DateStyle = 'medium') {
  return new Intl.DateTimeFormat('es-MX', { dateStyle, timeZone: MX_TIME_ZONE }).format(new Date(value));
}

// Hoy en Ciudad de México como fecha de solo día (medianoche UTC), para comparar con columnas @db.Date.
export function todayMx(now: Date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: MX_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  return new Date(`${parts}T00:00:00.000Z`);
}

// Suma días a una fecha de solo día.
export function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 86_400_000);
}
