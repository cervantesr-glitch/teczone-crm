import { z } from 'zod';

export const PIPELINES = ['PYME', 'SOLUCIONES'] as const;
export type Pipeline = (typeof PIPELINES)[number];

export const PIPELINE_LABELS: Record<Pipeline, string> = {
  PYME: 'Hardware y Software PyME',
  SOLUCIONES: 'Soluciones Tecnológicas',
};

// Etapas por pipeline (BRD v1.1, secciones 2 y 7). GANADA y PERDIDA cierran la oportunidad.
export const PIPELINE_STAGES = {
  PYME: ['SOLICITUD', 'COSTEO_MARGEN', 'COTIZACION_ENVIADA', 'NEGOCIACION', 'GANADA', 'PERDIDA'],
  SOLUCIONES: ['CALIFICACION', 'DISCOVERY', 'DEMO_POC', 'PROPUESTA_SOW', 'NEGOCIACION_SLA', 'GANADA', 'PERDIDA'],
} as const satisfies Record<Pipeline, readonly string[]>;

export type OpportunityStage = (typeof PIPELINE_STAGES)[Pipeline][number];

export const STAGE_LABELS: Record<OpportunityStage, string> = {
  SOLICITUD: 'Solicitud',
  COSTEO_MARGEN: 'Costeo y margen',
  COTIZACION_ENVIADA: 'Cotización enviada',
  NEGOCIACION: 'Negociación',
  CALIFICACION: 'Calificación',
  DISCOVERY: 'Discovery técnico',
  DEMO_POC: 'Demo / PoC',
  PROPUESTA_SOW: 'Propuesta formal y SOW',
  NEGOCIACION_SLA: 'Negociación y SLA',
  GANADA: 'Cerrada ganada',
  PERDIDA: 'Cerrada perdida',
};

// Probabilidad sugerida por etapa para el pipeline ponderado; editable por oportunidad.
export const STAGE_PROBABILITY: Record<OpportunityStage, number> = {
  SOLICITUD: 10,
  COSTEO_MARGEN: 25,
  COTIZACION_ENVIADA: 50,
  NEGOCIACION: 75,
  CALIFICACION: 10,
  DISCOVERY: 20,
  DEMO_POC: 40,
  PROPUESTA_SOW: 60,
  NEGOCIACION_SLA: 80,
  GANADA: 100,
  PERDIDA: 0,
};

export const CLOSED_STAGES: readonly OpportunityStage[] = ['GANADA', 'PERDIDA'];

export function firstStage(pipeline: Pipeline): OpportunityStage {
  return PIPELINE_STAGES[pipeline][0];
}

export function stageBelongsTo(pipeline: Pipeline, stage: string): stage is OpportunityStage {
  return (PIPELINE_STAGES[pipeline] as readonly string[]).includes(stage);
}

export const DECISION_ROLES = ['ECONOMICO', 'TECNICO', 'USUARIO', 'OTRO'] as const;
export type DecisionRole = (typeof DECISION_ROLES)[number];
export const DECISION_ROLE_LABELS: Record<DecisionRole, string> = {
  ECONOMICO: 'Económico (aprueba la compra)',
  TECNICO: 'Técnico (valida la solución)',
  USUARIO: 'Usuario',
  OTRO: 'Otro',
};

const text = (max = 191) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

const rfc = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/, 'RFC inválido')
  .optional()
  .nullable()
  .or(z.literal('').transform(() => null));

const email = z
  .string()
  .trim()
  .toLowerCase()
  .email('Correo inválido')
  .max(191)
  .optional()
  .nullable()
  .or(z.literal('').transform(() => null));

export const accountFieldsSchema = z.object({
  name: z.string().trim().min(1, 'Escribe el nombre de la cuenta').max(191),
  legalName: text(),
  rfc,
  industry: text(),
  companySize: text(),
  phone: text(30),
  website: text(),
  city: text(),
  state: text(),
  notes: text(5000),
});

export const createAccountSchema = accountFieldsSchema.extend({
  ownerId: z.string().uuid().optional().nullable(),
});
export const updateAccountSchema = createAccountSchema.partial();

export const contactFieldsSchema = z.object({
  name: z.string().trim().min(1, 'Escribe el nombre del contacto').max(191),
  title: text(),
  email,
  phone: text(30),
  whatsapp: text(30),
  decisionRole: z.enum(DECISION_ROLES).optional().nullable(),
  isPrimary: z.boolean().optional(),
});
export const updateContactSchema = contactFieldsSchema.partial();

const opportunityFields = {
  name: z.string().trim().min(1, 'Escribe el nombre de la oportunidad').max(191),
  amount: z.number().nonnegative().optional().nullable(),
  currency: z.enum(['MXN', 'USD']).optional().nullable(),
  expectedCloseDate: z.coerce.date().optional().nullable(),
};

// Conversión del lead (FR-25): cuenta y contacto nuevos o existentes, y la oportunidad inicial.
export const convertLeadSchema = z.object({
  account: z.discriminatedUnion('mode', [
    z.object({ mode: z.literal('existing'), accountId: z.string().uuid() }),
    z.object({ mode: z.literal('new'), data: accountFieldsSchema }),
  ]),
  contact: z.discriminatedUnion('mode', [
    z.object({ mode: z.literal('existing'), contactId: z.string().uuid() }),
    z.object({ mode: z.literal('new'), data: contactFieldsSchema }),
  ]),
  opportunity: z.object({ pipeline: z.enum(PIPELINES), ...opportunityFields }),
});

export const updateOpportunitySchema = z
  .object({
    ...opportunityFields,
    primaryContactId: z.string().uuid().nullable(),
    probability: z.number().int().min(0).max(100).nullable(),
  })
  .partial();

export const changeStageSchema = z
  .object({
    stage: z.string(),
    comment: text(2000),
    lostReason: text(2000),
  })
  .refine((v) => v.stage !== 'PERDIDA' || v.lostReason, {
    message: 'Indica el motivo de la pérdida',
    path: ['lostReason'],
  });

export const opportunityListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  pipeline: z.enum(PIPELINES).optional(),
  stage: z.string().optional(),
  ownerId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
  open: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

export const accountListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
export type ContactInput = z.infer<typeof contactFieldsSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
export type ConvertLeadInput = z.infer<typeof convertLeadSchema>;
export type UpdateOpportunityInput = z.infer<typeof updateOpportunitySchema>;
export type ChangeStageInput = z.infer<typeof changeStageSchema>;
export type OpportunityListQuery = z.infer<typeof opportunityListQuerySchema>;
export type AccountListQuery = z.infer<typeof accountListQuerySchema>;
