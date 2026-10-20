import type { Role } from '@teczone/shared';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  roles: Role[];
}

export interface AccessTokenPayload {
  sub: string;
  email: string;
  name: string;
  roles: Role[];
}
