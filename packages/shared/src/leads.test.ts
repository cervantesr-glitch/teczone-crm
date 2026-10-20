import { describe, expect, it } from 'vitest';
import { canTransition, LEAD_STATUSES } from './leads';

describe('transiciones de lead', () => {
  it('un lead convertido no puede cambiar de estado', () => {
    for (const to of LEAD_STATUSES) {
      expect(canTransition('CONVERTIDO', to)).toBe(false);
    }
  });

  it('solo un lead calificado se puede convertir', () => {
    const fromStates = LEAD_STATUSES.filter((s) => canTransition(s, 'CONVERTIDO'));
    expect(fromStates).toEqual(['CALIFICADO']);
  });

  it('un lead descalificado se puede reactivar', () => {
    expect(canTransition('DESCALIFICADO', 'NUEVO')).toBe(true);
  });
});
