import type { QuoteStatus } from '@teczone/shared';
import type { Contact } from './crm';
import type { Activity, NextAction, Ref } from './leads';

export interface Product {
  id: string;
  sku: string | null;
  name: string;
  description: string | null;
  category: 'HARDWARE' | 'SOFTWARE' | 'SERVICIOS';
  brand: string | null;
  unit: string;
  unitCost: string;
  listPrice: string;
  currency: 'MXN' | 'USD';
  active: boolean;
}

export interface QuoteItem {
  id: string;
  position: number;
  productId: string | null;
  sku: string | null;
  description: string;
  quantity: string;
  unitCost: string;
  unitPrice: string;
  discountPct: string;
  lineTotal: string;
  lineCost: string;
}

export interface QuoteVersion {
  id: string;
  number: number;
  currency: 'MXN' | 'USD';
  exchangeRate: string;
  taxRate: string;
  validUntil: string;
  terms: string | null;
  notes: string | null;
  subtotal: string;
  tax: string;
  total: string;
  totalCost: string;
  marginPct: string;
  minMarginPct: string;
  approvedAt: string | null;
  approvalComment: string | null;
  approvedBy: Ref | null;
  issuedAt: string | null;
  createdAt: string;
  createdBy: Ref;
  items: QuoteItem[];
}

export interface QuoteListItem {
  id: string;
  folio: string;
  status: QuoteStatus;
  currentVersion: number;
  updatedAt: string;
  owner: Ref;
  opportunity: Ref & { account: Ref };
  version: {
    number: number;
    currency: 'MXN' | 'USD';
    subtotal: string;
    total: string;
    totalCost: string;
    marginPct: string;
    validUntil: string;
  };
  nextAction: NextAction | null;
}

export interface QuoteDetail {
  id: string;
  folio: string;
  status: QuoteStatus;
  currentVersion: number;
  contactId: string | null;
  contact: Contact | null;
  ownerId: string;
  owner: Ref;
  sentAt: string | null;
  closedAt: string | null;
  rejectedReason: string | null;
  opportunity: Ref & { folio: string; pipeline: string; closedAt: string | null; account: Ref & { contacts: Contact[] } };
  versions: QuoteVersion[];
  statusHistory: {
    id: string;
    fromStatus: QuoteStatus | null;
    toStatus: QuoteStatus;
    versionNumber: number;
    comment: string | null;
    createdAt: string;
    user: Ref | null;
  }[];
  activities: Activity[];
  nextAction: NextAction | null;
}

export interface OpportunityQuote {
  id: string;
  folio: string;
  status: QuoteStatus;
  version: { number: number; currency: 'MXN' | 'USD'; subtotal: string; total: string; totalCost: string; marginPct: string };
}

export const QUOTE_STATUS_STYLES: Record<QuoteStatus, string> = {
  BORRADOR: 'bg-slate-100 text-slate-700',
  PENDIENTE_APROBACION: 'bg-amber-100 text-amber-800',
  AUTORIZADA: 'bg-sky-100 text-sky-800',
  ENVIADA: 'bg-indigo-100 text-indigo-800',
  EN_NEGOCIACION: 'bg-violet-100 text-violet-800',
  ACEPTADA: 'bg-emerald-100 text-emerald-800',
  RECHAZADA: 'bg-red-100 text-red-700',
  VENCIDA: 'bg-slate-200 text-slate-700',
};
