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

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NUEVO: 'Nuevo',
  CONTACTADO: 'Contactado',
  EN_CALIFICACION: 'En calificación',
  CALIFICADO: 'Calificado',
  DESCALIFICADO: 'Descalificado',
  CONVERTIDO: 'Convertido',
};

export const LEAD_INTEREST_LABELS: Record<LeadInterestType, string> = {
  PYME: 'Hardware/Software PyME',
  SOLUCIONES: 'Soluciones Tech',
  POR_DEFINIR: 'Por definir',
};

// SLA de primer contacto en horas hábiles (RN-14, propuesta pendiente de D16).
export const FIRST_CONTACT_SLA_HOURS: Record<LeadInterestType, number> = {
  PYME: 4,
  SOLUCIONES: 9,
  POR_DEFINIR: 4,
};

// Normaliza teléfonos a sus últimos 10 dígitos para comparar duplicados.
export function normalizePhone(phone: string | null | undefined): string | null {
  const digits = (phone ?? '').replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits || null;
}
