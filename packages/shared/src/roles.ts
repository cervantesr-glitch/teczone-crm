// Roles del BRD v1.1, sección 6. Un usuario puede tener varios.
export const ROLES = [
  'ADMIN',
  'DIRECCION',
  'GERENTE_COMERCIAL',
  'EJECUTIVO_PYME',
  'EJECUTIVO_TECH',
  'PREVENTA',
  'CUSTOMER_SUCCESS',
  'COMPRAS_OPERACIONES',
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrador del CRM',
  DIRECCION: 'Dirección',
  GERENTE_COMERCIAL: 'Gerente Comercial',
  EJECUTIVO_PYME: 'Ejecutivo PyME',
  EJECUTIVO_TECH: 'Ejecutivo Tech',
  PREVENTA: 'Ingeniero de Preventa',
  CUSTOMER_SUCCESS: 'Customer Success',
  COMPRAS_OPERACIONES: 'Compras / Operaciones',
};

// Roles que ven todos los leads; el resto solo ve los propios o asignados.
export const LEAD_FULL_ACCESS_ROLES: readonly Role[] = ['ADMIN', 'DIRECCION', 'GERENTE_COMERCIAL'];
