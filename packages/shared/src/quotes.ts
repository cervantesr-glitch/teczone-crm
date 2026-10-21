import { z } from 'zod';
import { mxPeriodStarts } from './dates';
import { CURRENCIES, PRODUCT_CATEGORIES } from './lead-schemas';

// Estados de cotización propuestos en el BRD v1.1 (sección 7.4). "Sustituida" se
// representa con las versiones anteriores a la vigente.
export const QUOTE_STATUSES = [
  'BORRADOR',
  'PENDIENTE_APROBACION',
  'AUTORIZADA',
  'ENVIADA',
  'EN_NEGOCIACION',
  'ACEPTADA',
  'RECHAZADA',
  'VENCIDA',
] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  BORRADOR: 'Borrador',
  PENDIENTE_APROBACION: 'Pendiente de autorización',
  AUTORIZADA: 'Autorizada',
  ENVIADA: 'Enviada',
  EN_NEGOCIACION: 'En negociación',
  ACEPTADA: 'Aceptada',
  RECHAZADA: 'Rechazada',
  VENCIDA: 'Vencida',
};

// Cotización activa: requiere responsable y próxima acción (RN-05).
export const ACTIVE_QUOTE_STATUSES: readonly QuoteStatus[] = [
  'BORRADOR',
  'PENDIENTE_APROBACION',
  'AUTORIZADA',
  'ENVIADA',
  'EN_NEGOCIACION',
];
// Estados que vencen al pasar la vigencia.
export const SENT_QUOTE_STATUSES: readonly QuoteStatus[] = ['ENVIADA', 'EN_NEGOCIACION'];
// Desde aquí se puede abrir una versión nueva para editar.
export const REVISABLE_QUOTE_STATUSES: readonly QuoteStatus[] = [
  'PENDIENTE_APROBACION',
  'AUTORIZADA',
  'ENVIADA',
  'EN_NEGOCIACION',
  'RECHAZADA',
  'VENCIDA',
];

export const formatQuoteFolio = (n: number, version?: number) =>
  `COT-${String(n).padStart(6, '0')}${version ? ` v${version}` : ''}`;

export interface QuoteSettings {
  minMarginPct: number;
  validityDays: number;
  taxRate: number;
  // TC de referencia MXN por USD; cada versión fija el suyo (riesgo "Costos/TC desactualizados").
  usdExchangeRate: number;
  terms: string;
}

// Datos del emisor que aparecen en el PDF (FR-06).
export interface CompanySettings {
  name: string;
  legalName: string;
  rfc: string;
  address: string;
  phone: string;
  email: string;
  website: string;
}

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  name: 'TecZone',
  legalName: '',
  rfc: '',
  address: '',
  phone: '',
  email: '',
  website: '',
};

export const companySettingsSchema = z.object({
  name: z.string().trim().min(1, 'Escribe el nombre comercial').max(191),
  legalName: z.string().trim().max(191),
  rfc: z.string().trim().toUpperCase().max(13),
  address: z.string().trim().max(500),
  phone: z.string().trim().max(60),
  email: z.string().trim().max(191),
  website: z.string().trim().max(191),
});

export const DEFAULT_QUOTE_SETTINGS: QuoteSettings = {
  minMarginPct: 15,
  validityDays: 15,
  taxRate: 16,
  usdExchangeRate: 18.5,
  terms: [
    'Precios sujetos a disponibilidad del fabricante al momento de la orden de compra.',
    'Los precios en dólares se facturan al tipo de cambio del día de facturación.',
    'Tiempo de entrega sujeto a confirmación de existencias.',
    'Forma de pago: 50% anticipo y 50% contra entrega, salvo acuerdo por escrito.',
  ].join('\n'),
};

// ---------- Cálculo (FR-04, FR-05) ----------

export interface QuoteLineInput {
  quantity: number;
  unitCost: number;
  unitPrice: number;
  discountPct: number;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function computeLine(line: QuoteLineInput) {
  const lineTotal = round2(line.quantity * line.unitPrice * (1 - line.discountPct / 100));
  const lineCost = round2(line.quantity * line.unitCost);
  return { lineTotal, lineCost };
}

// Margen = (venta − costo) / venta × 100, sin IVA (BRD, indicador "Margen comercial").
export function computeQuoteTotals(lines: QuoteLineInput[], taxRate: number) {
  let subtotal = 0;
  let totalCost = 0;
  for (const l of lines) {
    const { lineTotal, lineCost } = computeLine(l);
    subtotal += lineTotal;
    totalCost += lineCost;
  }
  subtotal = round2(subtotal);
  totalCost = round2(totalCost);
  const tax = round2((subtotal * taxRate) / 100);
  const marginPct = subtotal > 0 ? round2(((subtotal - totalCost) / subtotal) * 100) : 0;
  return { subtotal, tax, total: round2(subtotal + tax), totalCost, marginPct };
}

// ---------- Esquemas ----------

const text = (max = 191) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

const money = z.number({ invalid_type_error: 'Escribe un importe' }).nonnegative('No puede ser negativo').max(1e11);

export const productSchema = z.object({
  sku: text(64),
  name: z.string().trim().min(1, 'Escribe el nombre del producto').max(191),
  description: text(5000),
  category: z.enum(PRODUCT_CATEGORIES),
  brand: text(),
  unit: z.string().trim().min(1).max(30).default('pieza'),
  unitCost: money,
  listPrice: money,
  currency: z.enum(CURRENCIES),
  active: z.boolean().optional(),
});
export const updateProductSchema = productSchema.partial();

export const productListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.enum(PRODUCT_CATEGORIES).optional(),
  active: z.enum(['true', 'false', 'all']).default('true'),
});

export const quoteItemSchema = z.object({
  productId: z.string().uuid().optional().nullable(),
  sku: text(64),
  description: z.string().trim().min(1, 'Describe la partida').max(2000),
  quantity: z.number().positive('La cantidad debe ser mayor a cero').max(1e7),
  unitCost: money,
  unitPrice: money,
  discountPct: z.number().min(0).max(100).default(0),
});

export const quoteDraftSchema = z.object({
  contactId: z.string().uuid().optional().nullable(),
  currency: z.enum(CURRENCIES),
  exchangeRate: z.number().positive('El tipo de cambio debe ser mayor a cero').max(1000),
  validUntil: z.coerce.date(),
  terms: text(10000),
  notes: text(5000),
  items: z.array(quoteItemSchema).max(200),
});

export const createQuoteSchema = z.object({
  opportunityId: z.string().uuid(),
});

export const quoteCommentSchema = z.object({ comment: text(2000) });

export const rejectApprovalSchema = z.object({
  comment: z.string().trim().min(1, 'Explica qué hay que corregir').max(2000),
});

// Enviar exige programar el seguimiento (RN-05).
export const sendQuoteSchema = z.object({
  channel: z.enum(['CORREO', 'WHATSAPP', 'REUNION', 'OTRO']).default('CORREO'),
  comment: text(2000),
  followUp: z.object({
    subject: z.string().trim().min(1, 'Escribe el seguimiento').max(191),
    dueAt: z.coerce.date(),
  }),
});

export const quoteOutcomeSchema = z
  .object({
    status: z.enum(['EN_NEGOCIACION', 'ACEPTADA', 'RECHAZADA']),
    comment: text(2000),
    // Al aceptar, marca la oportunidad como ganada.
    winOpportunity: z.boolean().optional(),
  })
  .refine((v) => v.status !== 'RECHAZADA' || v.comment, {
    message: 'Indica el motivo del rechazo',
    path: ['comment'],
  });

export const quoteSettingsSchema = z.object({
  minMarginPct: z.number().min(0).max(100),
  validityDays: z.number().int().min(1).max(365),
  taxRate: z.number().min(0).max(100),
  usdExchangeRate: z.number().positive().max(1000),
  terms: z.string().trim().max(10000),
});

export const quoteListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(QUOTE_STATUSES).optional(),
  opportunityId: z.string().uuid().optional(),
  ownerId: z.string().uuid().optional(),
  active: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

export type ProductInput = z.infer<typeof productSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductListQuery = z.infer<typeof productListQuerySchema>;
export type QuoteItemInput = z.infer<typeof quoteItemSchema>;
export type QuoteDraftInput = z.infer<typeof quoteDraftSchema>;
export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;
export type SendQuoteInput = z.infer<typeof sendQuoteSchema>;
export type QuoteOutcomeInput = z.infer<typeof quoteOutcomeSchema>;
export type QuoteListQuery = z.infer<typeof quoteListQuerySchema>;

// Resultado de cotizaciones para el tablero de inicio (FR-10, RN-10; fórmulas por confirmar en D15).
// Ganada = cotización Aceptada; perdida = Rechazada. Las vencidas no cuentan como perdidas y una
// versión nueva reabre la cotización, así que deja de contar. El periodo se toma de la fecha de
// cierre real (closedAt) en hora de Ciudad de México. El importe es el subtotal sin IVA de la
// versión vigente; las de USD se convierten a MXN con el tipo de cambio guardado en esa versión.
export const WON_QUOTE_STATUS = 'ACEPTADA' satisfies QuoteStatus;
export const LOST_QUOTE_STATUS = 'RECHAZADA' satisfies QuoteStatus;

export interface ClosedQuoteRow {
  status: QuoteStatus;
  closedAt: Date;
  currency: (typeof CURRENCIES)[number];
  exchangeRate: number;
  subtotal: number;
}

export interface PeriodTotals {
  count: number;
  amountMxn: number;
}

export interface QuoteResultsSummary {
  year: number;
  month: number;
  won: { year: PeriodTotals; month: PeriodTotals };
  lost: { year: PeriodTotals; month: PeriodTotals };
}

export function summarizeQuoteResults(rows: ClosedQuoteRow[], now: Date = new Date()): QuoteResultsSummary {
  const { year, month, yearStart, monthStart, nextYearStart } = mxPeriodStarts(now);
  const empty = () => ({ year: { count: 0, amountMxn: 0 }, month: { count: 0, amountMxn: 0 } });
  const summary: QuoteResultsSummary = { year, month, won: empty(), lost: empty() };
  for (const r of rows) {
    const bucket = r.status === WON_QUOTE_STATUS ? summary.won : r.status === LOST_QUOTE_STATUS ? summary.lost : null;
    if (!bucket || r.closedAt < yearStart || r.closedAt >= nextYearStart) continue;
    const amount = r.currency === 'USD' ? r.subtotal * r.exchangeRate : r.subtotal;
    const periods = r.closedAt >= monthStart ? [bucket.year, bucket.month] : [bucket.year];
    for (const p of periods) {
      p.count += 1;
      p.amountMxn += amount;
    }
  }
  for (const b of [summary.won, summary.lost]) {
    b.year.amountMxn = round2(b.year.amountMxn);
    b.month.amountMxn = round2(b.month.amountMxn);
  }
  return summary;
}
