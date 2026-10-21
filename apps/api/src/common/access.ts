import type { Role } from '@teczone/shared';
import type { AuthUser } from '../auth/types';

// Matriz de acceso a cuentas y oportunidades (propuesta, BRD v1.1 D11).
export const ACCOUNT_READ_ROLES: Role[] = [
  'ADMIN',
  'DIRECCION',
  'GERENTE_COMERCIAL',
  'EJECUTIVO_PYME',
  'EJECUTIVO_TECH',
  'PREVENTA',
  'CUSTOMER_SUCCESS',
];
export const ACCOUNT_WRITE_ROLES: Role[] = [
  'ADMIN',
  'GERENTE_COMERCIAL',
  'EJECUTIVO_PYME',
  'EJECUTIVO_TECH',
  'CUSTOMER_SUCCESS',
];
export const OPPORTUNITY_READ_ROLES: Role[] = [
  'ADMIN',
  'DIRECCION',
  'GERENTE_COMERCIAL',
  'EJECUTIVO_PYME',
  'EJECUTIVO_TECH',
  'PREVENTA',
];
export const OPPORTUNITY_WRITE_ROLES: Role[] = ['ADMIN', 'GERENTE_COMERCIAL', 'EJECUTIVO_PYME', 'EJECUTIVO_TECH'];
// Ven todas las oportunidades; los ejecutivos solo las propias.
export const OPPORTUNITY_FULL_ROLES: Role[] = ['ADMIN', 'DIRECCION', 'GERENTE_COMERCIAL', 'PREVENTA'];

export const hasAnyRole = (user: AuthUser, roles: readonly Role[]) => user.roles.some((r) => roles.includes(r));
