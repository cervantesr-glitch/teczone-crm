import type { DecisionRole, OpportunityStage, Pipeline } from '@teczone/shared';
import type { Activity, NextAction, Ref } from './leads';

export interface Contact {
  id: string;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  decisionRole: DecisionRole | null;
  isPrimary: boolean;
}

export interface AccountListItem {
  id: string;
  name: string;
  legalName: string | null;
  rfc: string | null;
  industry: string | null;
  city: string | null;
  state: string | null;
  owner: Ref | null;
  _count: { contacts: number; opportunities: number };
}

export interface OpportunityListItem {
  id: string;
  folio: string;
  name: string;
  pipeline: Pipeline;
  stage: OpportunityStage;
  amount: string | null;
  currency: 'MXN' | 'USD' | null;
  probability: number | null;
  expectedCloseDate: string | null;
  closedAt: string | null;
  account: Ref;
  owner: Ref;
  primaryContact: Ref | null;
  nextAction?: NextAction | null;
}

export interface AccountDetail extends AccountListItem {
  companySize: string | null;
  phone: string | null;
  website: string | null;
  notes: string | null;
  contacts: Contact[];
  opportunities: OpportunityListItem[];
}

export interface OpportunityDetail extends OpportunityListItem {
  lostReason: string | null;
  account: Ref & { contacts: Contact[] };
  stageHistory: {
    id: string;
    fromStage: OpportunityStage | null;
    toStage: OpportunityStage;
    comment: string | null;
    createdAt: string;
    user: Ref;
  }[];
  sourceLeads: { id: string; folio: string }[];
  activities: Activity[];
}

export const STAGE_STYLES: Partial<Record<OpportunityStage, string>> = {
  GANADA: 'bg-emerald-100 text-emerald-800',
  PERDIDA: 'bg-slate-200 text-slate-700',
};
