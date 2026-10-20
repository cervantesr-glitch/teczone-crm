import { z } from 'zod';
import { LEAD_INTEREST_TYPES, LEAD_STATUSES } from './leads';

const optionalText = (max = 191) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

export const PRODUCT_CATEGORIES = ['HARDWARE', 'SOFTWARE', 'SERVICIOS'] as const;
export const ACTIVITY_TYPES = ['LLAMADA', 'REUNION', 'CORREO', 'WHATSAPP', 'NOTA', 'TAREA'] as const;
export const CURRENCIES = ['MXN', 'USD'] as const;

export const productInterestSchema = z.object({
  category: z.enum(PRODUCT_CATEGORIES),
  description: z.string().trim().min(1, 'Describe el producto o servicio').max(191),
  quantity: z.number().int().positive().optional().nullable(),
});

const leadFields = {
  companyName: z.string().trim().min(1, 'Escribe la empresa').max(191),
  contactName: z.string().trim().min(1, 'Escribe el nombre del contacto').max(191),
  contactTitle: optionalText(),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Correo inválido')
    .max(191)
    .optional()
    .nullable()
    .or(z.literal('').transform(() => null)),
  phone: optionalText(30),
  whatsapp: optionalText(30),
  rfc: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/, 'RFC inválido')
    .optional()
    .nullable()
    .or(z.literal('').transform(() => null)),
  industry: optionalText(),
  companySize: optionalText(),
  city: optionalText(),
  state: optionalText(),
  need: optionalText(5000),
  interestType: z.enum(LEAD_INTEREST_TYPES).default('POR_DEFINIR'),
  sourceId: z.string().uuid('Elige la fuente'),
  estimatedBudget: z.number().nonnegative().optional().nullable(),
  currency: z.enum(CURRENCIES).optional().nullable(),
  expectedPurchaseDate: z.coerce.date().optional().nullable(),
};

export const createLeadSchema = z
  .object({
    ...leadFields,
    ownerId: z.string().uuid().optional().nullable(),
    receivedAt: z.coerce.date().optional(),
    productsOfInterest: z.array(productInterestSchema).max(50).default([]),
    // Guardar aunque haya posibles duplicados (el usuario ya los revisó).
    confirmDuplicate: z.boolean().default(false),
  })
  .refine((v) => v.email || v.phone || v.whatsapp, {
    message: 'Captura al menos un correo o teléfono',
    path: ['email'],
  });

export const updateLeadSchema = z
  .object({
    ...leadFields,
    productsOfInterest: z.array(productInterestSchema).max(50),
  })
  .partial();

export const assignLeadSchema = z.object({
  ownerId: z.string().uuid().nullable(),
});

export const changeLeadStatusSchema = z
  .object({
    status: z.enum(LEAD_STATUSES).exclude(['CONVERTIDO']),
    comment: optionalText(2000),
    disqualificationReasonId: z.string().uuid().optional().nullable(),
    disqualificationNotes: optionalText(2000),
  })
  .refine((v) => v.status !== 'DESCALIFICADO' || (v.disqualificationReasonId && v.disqualificationNotes), {
    message: 'Para descalificar indica el motivo y las notas',
    path: ['disqualificationReasonId'],
  });

// Calificación BANT propuesta; los criterios definitivos se acuerdan en D16.
export const BANT_CRITERIA = ['budget', 'authority', 'need', 'timeline'] as const;
export const BANT_LABELS: Record<(typeof BANT_CRITERIA)[number], string> = {
  budget: 'Presupuesto',
  authority: 'Autoridad (habla con quien decide)',
  need: 'Necesidad clara',
  timeline: 'Fecha de compra definida',
};

export const qualificationSchema = z.object({
  budget: z.boolean(),
  authority: z.boolean(),
  need: z.boolean(),
  timeline: z.boolean(),
  notes: optionalText(2000),
});

export type Qualification = z.infer<typeof qualificationSchema>;

export function qualificationScore(q: Qualification): number {
  return BANT_CRITERIA.filter((k) => q[k]).length * 25;
}

export const createActivitySchema = z
  .object({
    type: z.enum(ACTIVITY_TYPES),
    subject: z.string().trim().min(1, 'Escribe el asunto').max(191),
    description: optionalText(5000),
    occurredAt: z.coerce.date().optional().nullable(),
    dueAt: z.coerce.date().optional().nullable(),
  })
  .refine((v) => v.type !== 'TAREA' || v.dueAt, {
    message: 'Una tarea necesita fecha de vencimiento',
    path: ['dueAt'],
  });

export const leadListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(LEAD_STATUSES).optional(),
  interestType: z.enum(LEAD_INTEREST_TYPES).optional(),
  ownerId: z.union([z.string().uuid(), z.literal('none')]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

export const duplicateCheckSchema = z.object({
  companyName: z.string().trim().max(191).optional(),
  email: z.string().trim().toLowerCase().max(191).optional(),
  phone: z.string().trim().max(30).optional(),
  rfc: z.string().trim().toUpperCase().max(20).optional(),
  excludeId: z.string().uuid().optional(),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type ChangeLeadStatusInput = z.infer<typeof changeLeadStatusSchema>;
export type CreateActivityInput = z.infer<typeof createActivitySchema>;
export type LeadListQuery = z.infer<typeof leadListQuerySchema>;
export type DuplicateCheckInput = z.infer<typeof duplicateCheckSchema>;
