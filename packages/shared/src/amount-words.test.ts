import { describe, expect, it } from 'vitest';
import { amountInWords, integerInWords } from './amount-words';

describe('importe con letra', () => {
  it.each([
    [1, 'UN'],
    [16, 'DIECISÉIS'],
    [21, 'VEINTIÚN'],
    [100, 'CIEN'],
    [101, 'CIENTO UN'],
    [1000, 'MIL'],
    [2_500, 'DOS MIL QUINIENTOS'],
    [148_688, 'CIENTO CUARENTA Y OCHO MIL SEISCIENTOS OCHENTA Y OCHO'],
    [1_000_000, 'UN MILLÓN'],
    [3_200_015, 'TRES MILLONES DOSCIENTOS MIL QUINCE'],
  ])('%i', (n, words) => {
    expect(integerInWords(n)).toBe(words);
  });

  it('agrega moneda y centavos', () => {
    expect(amountInWords(148688.8, 'MXN')).toBe('CIENTO CUARENTA Y OCHO MIL SEISCIENTOS OCHENTA Y OCHO PESOS 80/100 M.N.');
    expect(amountInWords(1, 'USD')).toBe('UN DÓLAR 00/100 USD');
    expect(amountInWords(2_000_000, 'MXN')).toBe('DOS MILLONES DE PESOS 00/100 M.N.');
  });
});
