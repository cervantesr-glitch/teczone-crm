import type { Role } from '@teczone/shared';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  roles: Role[];
}
