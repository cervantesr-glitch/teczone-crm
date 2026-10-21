import { describe, expect, it } from 'vitest';
import {
  costMarginPct,
  computeQuoteTotals,
  formatQuoteFolio,
  marginFromPrice,
  priceFromMargin,
  quoteOutcomeSchema,
  summarizeQuoteResults,
  type QuoteStatus,
} from './quotes';

describe('computeQuoteTotals', () => {
  it('calcula subtotal, IVA, total y margen sin IVA', () => {
    const r = computeQuoteTotals(
      [
        { quantity: 2, unitCost: 800, unitPrice: 1000, discountPct: 0 },
        { quantity: 1, unitCost: 300, unitPrice: 500, discountPct: 10 },
      ],
      16,
    );
    expect(r).toEqual({ subtotal: 2450, tax: 392, total: 2842, totalCost: 1900, marginPct: 22.45 });
  });

  it('devuelve margen cero sin partidas', () => {
    expect(computeQuoteTotals([], 16).marginPct).toBe(0);
  });
});

describe('precio a partir del margen sobre costo', () => {
  it('aplica el margen sobre el costo', () => {
    expect(priceFromMargin(20000, 50)).toBe(30000);
    expect(priceFromMargin(1000, 15)).toBe(1150);
    expect(priceFromMargin(100, 0)).toBe(100);
    expect(priceFromMargin(100, 150)).toBe(250);
  });

  it('redondea hacia arriba para no quedar debajo del margen capturado', () => {
    const price = priceFromMargin(2.03, 15);
    expect(price).toBe(2.34);
    expect(marginFromPrice(2.03, price)).toBeGreaterThanOrEqual(15);
  });

  it('no acepta margen de −100% o menos', () => {
    expect(priceFromMargin(100, -100)).toBeNaN();
    expect(Number.isNaN(priceFromMargin(100, -99.99))).toBe(false);
  });

  it('el margen capturado coincide con el de los totales', () => {
    const unitPrice = priceFromMargin(20000, 50);
    expect(marginFromPrice(20000, unitPrice)).toBe(50);
    const r = computeQuoteTotals([{ quantity: 3, unitCost: 20000, unitPrice, discountPct: 0 }], 16);
    expect(costMarginPct(r.subtotal, r.totalCost)).toBe(50);
    expect(r.marginPct).toBe(33.33);
  });

  it('sin costo usa el margen sobre la venta', () => {
    expect(costMarginPct(2500, 0)).toBe(100);
    expect(costMarginPct(0, 0)).toBe(0);
  });
});

describe('cotizaciones', () => {
  it('formatea el folio con versión', () => {
    expect(formatQuoteFolio(12, 3)).toBe('COT-000012 v3');
  });

  it('exige motivo al rechazar', () => {
    expect(quoteOutcomeSchema.safeParse({ status: 'RECHAZADA' }).success).toBe(false);
    expect(quoteOutcomeSchema.safeParse({ status: 'RECHAZADA', comment: 'Precio' }).success).toBe(true);
  });
});

describe('summarizeQuoteResults', () => {
  // 21 oct 2026, 15:00 en Ciudad de México.
  const now = new Date('2026-10-21T21:00:00.000Z');
  const row = (status: QuoteStatus, closedAt: string, subtotal: number, currency: 'MXN' | 'USD' = 'MXN', exchangeRate = 18) => ({
    status,
    closedAt: new Date(closedAt),
    currency,
    exchangeRate,
    subtotal,
  });

  it('separa ganadas y perdidas del año y del mes, y convierte USD con el TC guardado', () => {
    const r = summarizeQuoteResults(
      [
        row('ACEPTADA', '2026-10-05T18:00:00.000Z', 1000),
        row('ACEPTADA', '2026-10-10T18:00:00.000Z', 100, 'USD', 18.5),
        row('ACEPTADA', '2026-03-10T18:00:00.000Z', 500),
        row('RECHAZADA', '2026-10-20T18:00:00.000Z', 300),
        row('RECHAZADA', '2026-02-01T18:00:00.000Z', 200, 'USD', 17),
      ],
      now,
    );
    expect(r.year).toBe(2026);
    expect(r.month).toBe(10);
    expect(r.won).toEqual({ year: { count: 3, amountMxn: 3350 }, month: { count: 2, amountMxn: 2850 } });
    expect(r.lost).toEqual({ year: { count: 2, amountMxn: 3700 }, month: { count: 1, amountMxn: 300 } });
  });

  it('usa la hora de México en los cortes de mes y año', () => {
    const r = summarizeQuoteResults(
      [
        // 30 sep 23:00 en México: cuenta en el año, no en octubre.
        row('ACEPTADA', '2026-10-01T05:00:00.000Z', 100),
        // 1 oct 00:30 en México: cuenta en octubre.
        row('ACEPTADA', '2026-10-01T06:30:00.000Z', 200),
        // 31 dic 2025 23:00 en México: año anterior.
        row('RECHAZADA', '2026-01-01T05:00:00.000Z', 400),
      ],
      now,
    );
    expect(r.won).toEqual({ year: { count: 2, amountMxn: 300 }, month: { count: 1, amountMxn: 200 } });
    expect(r.lost.year.count).toBe(0);
  });

  it('ignora otros estados como vencida', () => {
    const r = summarizeQuoteResults([row('VENCIDA', '2026-10-05T18:00:00.000Z', 1000)], now);
    expect(r.won.year.count + r.lost.year.count).toBe(0);
  });
});
