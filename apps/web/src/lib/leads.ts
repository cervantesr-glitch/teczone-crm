import type { LeadInterestType, LeadStatus } from '@teczone/shared';

export interface Ref {
  id: string;
  name: string;
}

export interface NextAction {
  id: string;
  subject: string;
  dueAt: string;
}

export interface LeadListItem {
  id: string;
  folio: string;
  status: LeadStatus;
  interestType: LeadInterestType;
  companyName: string;
  contactName: string;
  email: string | null;
  phone: string | null;
  receivedAt: string;
  firstContactDueAt: string | null;
  firstContactAt: string | null;
  firstContactOverdue: boolean;
  score: number | null;
  owner: Ref | null;
  source: Ref;
  nextAction: NextAction | null;
}

export interface Activity {
  id: string;
  type: string;
  subject: string;
  description: string | null;
  occurredAt: string | null;
  dueAt: string | null;
  completedAt: string | null;
  createdAt: string;
  owner: Ref;
}

export interface LeadDetail extends LeadListItem {
  contactTitle: string | null;
  whatsapp: string | null;
  rfc: string | null;
  industry: string | null;
  companySize: string | null;
  city: string | null;
  state: string | null;
  need: string | null;
  estimatedBudget: string | null;
  currency: 'MXN' | 'USD' | null;
  expectedPurchaseDate: string | null;
  qualification: { budget: boolean; authority: boolean; need: boolean; timeline: boolean; notes: string | null } | null;
  disqualificationNotes: string | null;
  disqualificationReason: Ref | null;
  convertedAccount: Ref | null;
  convertedOpportunity: { id: string; name: string; folio: string } | null;
  createdBy: Ref;
  productsOfInterest: { id: string; category: string; description: string; quantity: number | null }[];
  statusHistory: {
    id: string;
    fromStatus: LeadStatus | null;
    toStatus: LeadStatus;
    comment: string | null;
    createdAt: string;
    user: Ref;
  }[];
  activities: Activity[];
}

export interface Duplicate {
  id: string;
  folio: string;
  companyName: string;
  contactName: string;
  status: LeadStatus;
  ownerName: string | null;
  matchedOn: string[];
}

export const STATUS_STYLES: Record<LeadStatus, string> = {
  NUEVO: 'bg-sky-100 text-sky-800',
  CONTACTADO: 'bg-indigo-100 text-indigo-800',
  EN_CALIFICACION: 'bg-amber-100 text-amber-800',
  CALIFICADO: 'bg-emerald-100 text-emerald-800',
  DESCALIFICADO: 'bg-slate-200 text-slate-700',
  CONVERTIDO: 'bg-violet-100 text-violet-800',
};

export const ACTIVITY_LABELS: Record<string, string> = {
  LLAMADA: 'Llamada',
  REUNION: 'Reunión',
  CORREO: 'Correo',
  WHATSAPP: 'WhatsApp',
  NOTA: 'Nota',
  TAREA: 'Tarea',
};

export const CATEGORY_LABELS: Record<string, string> = {
  HARDWARE: 'Hardware',
  SOFTWARE: 'Software',
  SERVICIOS: 'Servicios',
};
