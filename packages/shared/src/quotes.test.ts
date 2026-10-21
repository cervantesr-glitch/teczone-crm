import { describe, expect, it } from 'vitest';
import { computeQuoteTotals, formatQuoteFolio, quoteOutcomeSchema } from './quotes';

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

describe('cotizaciones', () => {
  it('formatea el folio con versión', () => {
    expect(formatQuoteFolio(12, 3)).toBe('COT-000012 v3');
  });

  it('exige motivo al rechazar', () => {
    expect(quoteOutcomeSchema.safeParse({ status: 'RECHAZADA' }).success).toBe(false);
    expect(quoteOutcomeSchema.safeParse({ status: 'RECHAZADA', comment: 'Precio' }).success).toBe(true);
  });
});
