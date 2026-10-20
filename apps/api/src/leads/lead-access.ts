import { LEAD_FULL_ACCESS_ROLES, type Role } from '@teczone/shared';
import type { AuthUser } from '../auth/types';

// Roles con acceso al módulo de leads (BRD v1.1, matriz propuesta).
export const LEAD_READ_ROLES: Role[] = ['ADMIN', 'DIRECCION', 'GERENTE_COMERCIAL', 'EJECUTIVO_PYME', 'EJECUTIVO_TECH'];
export const LEAD_WRITE_ROLES: Role[] = ['ADMIN', 'GERENTE_COMERCIAL', 'EJECUTIVO_PYME', 'EJECUTIVO_TECH'];
export const LEAD_ASSIGN_ROLES: Role[] = ['ADMIN', 'GERENTE_COMERCIAL'];
// Quienes pueden ser responsables de un lead.
export const SELLER_ROLES: Role[] = ['EJECUTIVO_PYME', 'EJECUTIVO_TECH', 'GERENTE_COMERCIAL'];

export function hasFullLeadAccess(user: AuthUser) {
  return user.roles.some((r) => LEAD_FULL_ACCESS_ROLES.includes(r));
}

export function canAssignLeads(user: AuthUser) {
  return user.roles.some((r) => LEAD_ASSIGN_ROLES.includes(r));
}

export function isSeller(user: AuthUser) {
  return user.roles.some((r) => SELLER_ROLES.includes(r));
}

export function canWriteLeads(user: AuthUser) {
  return user.roles.some((r) => LEAD_WRITE_ROLES.includes(r));
}

// Los ejecutivos ven sus leads y los que no tienen responsable.
export function leadVisibilityFilter(user: AuthUser) {
  if (hasFullLeadAccess(user)) return {};
  return { OR: [{ ownerId: user.id }, { ownerId: null }] };
}

export function formatFolio(n: number) {
  return `LD-${String(n).padStart(6, '0')}`;
}
