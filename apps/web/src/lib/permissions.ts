import { LEAD_FULL_ACCESS_ROLES, type Role } from '@teczone/shared';
import type { SessionUser } from './types';

const has = (user: SessionUser | null, roles: readonly Role[]) => !!user?.roles.some((r) => roles.includes(r));

// Mismas reglas que la API (apps/api/src/leads/lead-access.ts); la API es la que decide.
export const canSeeLeads = (u: SessionUser | null) =>
  has(u, ['ADMIN', 'DIRECCION', 'GERENTE_COMERCIAL', 'EJECUTIVO_PYME', 'EJECUTIVO_TECH']);
export const canWriteLeads = (u: SessionUser | null) =>
  has(u, ['ADMIN', 'GERENTE_COMERCIAL', 'EJECUTIVO_PYME', 'EJECUTIVO_TECH']);
export const canAssignLeads = (u: SessionUser | null) => has(u, ['ADMIN', 'GERENTE_COMERCIAL']);
export const hasFullLeadAccess = (u: SessionUser | null) => has(u, LEAD_FULL_ACCESS_ROLES);
export const isAdmin = (u: SessionUser | null) => has(u, ['ADMIN']);
export const isSeller = (u: SessionUser | null) => has(u, ['EJECUTIVO_PYME', 'EJECUTIVO_TECH', 'GERENTE_COMERCIAL']);
