// Estados y tipos de interés del lead (BRD v1.1, sección 7.5).
export const LEAD_STATUSES = [
  'NUEVO',
  'CONTACTADO',
  'EN_CALIFICACION',
  'CALIFICADO',
  'DESCALIFICADO',
  'CONVERTIDO',
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_INTEREST_TYPES = ['PYME', 'SOLUCIONES', 'POR_DEFINIR'] as const;

export type LeadInterestType = (typeof LEAD_INTEREST_TYPES)[number];

// Transiciones permitidas. Un lead convertido no vuelve a estados anteriores (RN-13);
// uno descalificado puede reactivarse.
export const LEAD_TRANSITIONS: Record<LeadStatus, readonly LeadStatus[]> = {
  NUEVO: ['CONTACTADO', 'DESCALIFICADO'],
  CONTACTADO: ['EN_CALIFICACION', 'DESCALIFICADO'],
  EN_CALIFICACION: ['CALIFICADO', 'DESCALIFICADO'],
  CALIFICADO: ['CONVERTIDO', 'EN_CALIFICACION', 'DESCALIFICADO'],
  DESCALIFICADO: ['NUEVO', 'CONTACTADO'],
  CONVERTIDO: [],
};

export function canTransition(from: LeadStatus, to: LeadStatus): boolean {
  return LEAD_TRANSITIONS[from].includes(to);
}
