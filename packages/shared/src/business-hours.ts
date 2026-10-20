// Calendario hábil para SLA (BRD RN-04, RN-14). Pendiente de confirmar en D04:
// por ahora lunes a viernes de 9:00 a 18:00, hora del centro de México (UTC-6, sin horario de verano)
// y sin días festivos.
export interface BusinessCalendar {
  utcOffsetHours: number;
  startHour: number;
  endHour: number;
  workDays: readonly number[]; // 0 = domingo
}

export const DEFAULT_CALENDAR: BusinessCalendar = {
  utcOffsetHours: -6,
  startHour: 9,
  endHour: 18,
  workDays: [1, 2, 3, 4, 5],
};

const HOUR = 60 * 60 * 1000;

// Suma horas hábiles a una fecha. Si empieza fuera de horario, el reloj arranca
// en la siguiente apertura.
export function addBusinessHours(start: Date, hours: number, cal: BusinessCalendar = DEFAULT_CALENDAR): Date {
  const offset = cal.utcOffsetHours * HOUR;
  // Se trabaja en "hora local" representada con métodos UTC.
  let local = new Date(start.getTime() + offset);
  let remaining = hours * HOUR;

  for (let guard = 0; guard < 3650; guard++) {
    const open = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), cal.startHour);
    const close = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), cal.endHour);
    const isWorkDay = cal.workDays.includes(local.getUTCDay());

    if (isWorkDay && local.getTime() < close) {
      const from = Math.max(local.getTime(), open);
      const available = close - from;
      if (remaining <= available) {
        return new Date(from + remaining - offset);
      }
      remaining -= available;
    }
    // Siguiente día a medianoche local.
    local = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + 1));
  }
  throw new Error('No se pudo calcular el vencimiento en horas hábiles');
}
