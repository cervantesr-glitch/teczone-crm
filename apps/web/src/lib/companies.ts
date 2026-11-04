import type { Role } from '@teczone/shared';

export interface Company {
  id: string;
  name: string;
  legalName: string;
  rfc: string;
  taxRegime: string | null;
  postalCode: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  active: boolean;
  hasLogo: boolean;
  quoteCount: number;
  userCount: number;
  updatedAt: string;
}

export interface CompanyAssignment {
  id: string;
  name: string;
  email: string;
  roles: Role[];
  defaultCompanyId: string | null;
}
