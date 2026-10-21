import { describe, expect, it } from 'vitest';
import { computeQuoteTotals, formatQuoteFolio, marginFromPrice, priceFromMargin, quoteOutcomeSchema } from './quotes';

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

describe('precio a partir del margen', () => {
  it('calcula el precio con margen sobre la venta', () => {
    expect(priceFromMargin(20000, 50)).toBe(40000);
    expect(priceFromMargin(850, 15)).toBe(1000);
    expect(priceFromMargin(100, 0)).toBe(100);
  });

  it('redondea hacia arriba para no quedar debajo del margen capturado', () => {
    const price = priceFromMargin(2, 15);
    expect(price).toBe(2.36);
    expect(marginFromPrice(2, price)).toBeGreaterThanOrEqual(15);
  });

  it('no acepta margen de 100% o más', () => {
    expect(priceFromMargin(100, 100)).toBeNaN();
    expect(priceFromMargin(100, 120)).toBeNaN();
  });

  it('el margen calculado coincide con el de los totales', () => {
    const unitPrice = priceFromMargin(20000, 50);
    expect(marginFromPrice(20000, unitPrice)).toBe(50);
    expect(computeQuoteTotals([{ quantity: 3, unitCost: 20000, unitPrice, discountPct: 0 }], 16).marginPct).toBe(50);
  });

  it('devuelve margen cero sin precio', () => {
    expect(marginFromPrice(10, 0)).toBe(0);
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
