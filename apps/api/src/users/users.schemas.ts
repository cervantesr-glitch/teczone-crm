import { passwordSchema, ROLES } from '@teczone/shared';
import { z } from 'zod';

const rolesSchema = z.array(z.enum(ROLES)).min(1, 'Asigna al menos un rol');

export const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().email('Correo inválido'),
  name: z.string().trim().min(2, 'Escribe el nombre'),
  password: passwordSchema,
  roles: rolesSchema,
});

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(2).optional(),
    roles: rolesSchema.optional(),
    active: z.boolean().optional(),
    password: passwordSchema.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'No hay cambios');

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
