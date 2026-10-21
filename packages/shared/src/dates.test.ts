import { describe, expect, it } from 'vitest';
import { formatDayOnly, formatInstantDate, mxPeriodStarts, todayMx } from './dates';

describe('fechas de solo día', () => {
  // Caso de COT-000001: vigencia guardada como @db.Date del 5 de noviembre.
  const vigencia = '2026-11-05T00:00:00.000Z';

  it('la vigencia se muestra con su día, no el anterior', () => {
    expect(formatDayOnly(vigencia, 'long')).toBe('5 de noviembre de 2026');
    expect(formatDayOnly(new Date(vigencia), 'long')).toBe('5 de noviembre de 2026');
  });

  it('formatear la vigencia como instante en México da el día anterior (el bug)', () => {
    expect(formatInstantDate(vigencia, 'long')).toBe('4 de noviembre de 2026');
  });

  it('app y PDF coinciden en el día de la vigencia', () => {
    expect(formatDayOnly(vigencia, 'medium')).toContain('5 nov');
  });
});

describe('instantes', () => {
  it('una cotización enviada a las 20:00 de México lleva la fecha de ese día', () => {
    // 21 oct 02:00 UTC = 20 oct 20:00 en Ciudad de México.
    expect(formatInstantDate('2026-10-21T02:00:00.000Z', 'long')).toBe('20 de octubre de 2026');
  });
});

describe('todayMx', () => {
  it('a las 20:00 de México sigue siendo el mismo día', () => {
    expect(todayMx(new Date('2026-10-21T02:00:00.000Z'))).toEqual(new Date('2026-10-20T00:00:00.000Z'));
  });

  it('después de medianoche en México ya es el día siguiente', () => {
    expect(todayMx(new Date('2026-10-21T06:30:00.000Z'))).toEqual(new Date('2026-10-21T00:00:00.000Z'));
  });
});

describe('mxPeriodStarts', () => {
  it('usa el mes de Ciudad de México y devuelve la medianoche local como instante', () => {
    // 1 nov 2026 a las 03:00 UTC sigue siendo 31 oct en México (UTC-6).
    const p = mxPeriodStarts(new Date('2026-11-01T03:00:00.000Z'));
    expect(p).toMatchObject({ year: 2026, month: 10 });
    expect(p.yearStart).toEqual(new Date('2026-01-01T06:00:00.000Z'));
    expect(p.monthStart).toEqual(new Date('2026-10-01T06:00:00.000Z'));
    expect(p.nextYearStart).toEqual(new Date('2027-01-01T06:00:00.000Z'));
  });
});
