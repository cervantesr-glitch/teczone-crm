import { describe, expect, it } from 'vitest';
import { addBusinessHours } from './business-hours';

// Hora del centro de México = UTC-6.
const mx = (iso: string) => new Date(`${iso}-06:00`);

describe('addBusinessHours', () => {
  it('suma dentro del mismo día hábil', () => {
    expect(addBusinessHours(mx('2026-10-20T10:00:00'), 4)).toEqual(mx('2026-10-20T14:00:00'));
  });

  it('pasa al día siguiente al cerrar', () => {
    expect(addBusinessHours(mx('2026-10-20T16:00:00'), 4)).toEqual(mx('2026-10-21T11:00:00'));
  });

  it('un lead de viernes en la tarde vence el lunes', () => {
    // 2026-10-23 es viernes.
    expect(addBusinessHours(mx('2026-10-23T17:00:00'), 4)).toEqual(mx('2026-10-26T12:00:00'));
  });

  it('fuera de horario arranca en la siguiente apertura', () => {
    expect(addBusinessHours(mx('2026-10-20T22:30:00'), 4)).toEqual(mx('2026-10-21T13:00:00'));
    expect(addBusinessHours(mx('2026-10-25T08:00:00'), 4)).toEqual(mx('2026-10-26T13:00:00'));
  });

  it('un día hábil completo son 9 horas', () => {
    expect(addBusinessHours(mx('2026-10-20T09:00:00'), 9)).toEqual(mx('2026-10-20T18:00:00'));
  });
});
