import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Correo inválido'),
  password: z.string().min(1, 'Escribe tu contraseña'),
});

export type LoginInput = z.infer<typeof loginSchema>;

// Mínimo 10 caracteres con al menos una letra y un número.
export const passwordSchema = z
  .string()
  .min(10, 'La contraseña debe tener al menos 10 caracteres')
  .regex(/[A-Za-z]/, 'La contraseña debe incluir una letra')
  .regex(/\d/, 'La contraseña debe incluir un número');
