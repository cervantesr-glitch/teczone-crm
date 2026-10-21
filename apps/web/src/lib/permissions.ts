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
// Cuentas y oportunidades (apps/api/src/common/access.ts).
export const canSeeAccounts = (u: SessionUser | null) =>
  has(u, ['ADMIN', 'DIRECCION', 'GERENTE_COMERCIAL', 'EJECUTIVO_PYME', 'EJECUTIVO_TECH', 'PREVENTA', 'CUSTOMER_SUCCESS']);
export const canWriteAccounts = (u: SessionUser | null) =>
  has(u, ['ADMIN', 'GERENTE_COMERCIAL', 'EJECUTIVO_PYME', 'EJECUTIVO_TECH', 'CUSTOMER_SUCCESS']);
export const canSeeOpportunities = (u: SessionUser | null) =>
  has(u, ['ADMIN', 'DIRECCION', 'GERENTE_COMERCIAL', 'EJECUTIVO_PYME', 'EJECUTIVO_TECH', 'PREVENTA']);
export const isManager = (u: SessionUser | null) => has(u, ['ADMIN', 'GERENTE_COMERCIAL']);
export const canWriteOpportunities = (u: SessionUser | null) =>
  has(u, ['ADMIN', 'GERENTE_COMERCIAL', 'EJECUTIVO_PYME', 'EJECUTIVO_TECH']);
export const canEditOpportunity = (u: SessionUser | null, ownerId: string) =>
  isManager(u) || (has(u, ['EJECUTIVO_PYME', 'EJECUTIVO_TECH']) && u?.id === ownerId);
// Cotizaciones y catálogo (apps/api/src/common/access.ts).
export const canSeeQuotes = canSeeOpportunities;
export const canApproveQuotes = isManager;
export const canSeeProducts = (u: SessionUser | null) => canSeeOpportunities(u) || has(u, ['COMPRAS_OPERACIONES']);
export const canWriteProducts = (u: SessionUser | null) => has(u, ['ADMIN', 'GERENTE_COMERCIAL', 'COMPRAS_OPERACIONES']);
