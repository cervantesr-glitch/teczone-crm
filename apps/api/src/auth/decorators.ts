import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Role } from '@teczone/shared';
import type { AuthUser } from './types';

export const IS_PUBLIC_KEY = 'isPublic';
export const ROLES_KEY = 'roles';

// Ruta accesible sin sesión.
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// Ruta accesible solo si el usuario tiene al menos uno de estos roles.
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => ctx.switchToHttp().getRequest().user,
);
