import { z } from 'zod';

// Catálogo de empresas emisoras: cada cotización se emite a nombre de una (FR-06).

export const RFC_PATTERN = /^[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}$/;

// Catálogo c_RegimenFiscal del SAT (CFDI 4.0).
export const TAX_REGIMES = [
  '601 General de Ley Personas Morales',
  '603 Personas Morales con Fines no Lucrativos',
  '605 Sueldos y Salarios e Ingresos Asimilados a Salarios',
  '606 Arrendamiento',
  '607 Régimen de Enajenación o Adquisición de Bienes',
  '608 Demás ingresos',
  '610 Residentes en el Extranjero sin Establecimiento Permanente en México',
  '611 Ingresos por Dividendos (socios y accionistas)',
  '612 Personas Físicas con Actividades Empresariales y Profesionales',
  '614 Ingresos por intereses',
  '615 Régimen de los ingresos por obtención de premios',
  '616 Sin obligaciones fiscales',
  '620 Sociedades Cooperativas de Producción que optan por diferir sus ingresos',
  '621 Incorporación Fiscal',
  '622 Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras',
  '623 Opcional para Grupos de Sociedades',
  '624 Coordinados',
  '625 Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas',
  '626 Régimen Simplificado de Confianza',
] as const;

// Datos de la empresa que se imprimen en la cotización.
export interface CompanyProfile {
  name: string;
  legalName: string;
  rfc: string;
  taxRegime: string | null;
  postalCode: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
}

export const COMPANY_PROFILE_KEYS = [
  'name',
  'legalName',
  'rfc',
  'taxRegime',
  'postalCode',
  'address',
  'phone',
  'email',
  'website',
] as const satisfies readonly (keyof CompanyProfile)[];

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

export const companySchema = z.object({
  name: z.string().trim().min(1, 'Escribe el nombre comercial').max(191),
  legalName: z.string().trim().min(1, 'Escribe la razón social').max(191),
  rfc: z
    .string()
    .trim()
    .toUpperCase()
    .regex(RFC_PATTERN, 'RFC inválido: 12 caracteres (moral) o 13 (física)'),
  taxRegime: optional(191),
  postalCode: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || /^\d{5}$/.test(v), 'El código postal tiene 5 dígitos'),
  address: optional(500),
  phone: optional(60),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(191)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || z.string().email().safeParse(v).success, 'Correo inválido'),
  website: optional(191),
  active: z.boolean().optional(),
});
export const updateCompanySchema = companySchema.partial();

// Logo en data URL (PNG o JPG), hasta 1 MB.
export const COMPANY_LOGO_MAX_BYTES = 1_000_000;
export const COMPANY_LOGO_TYPES = ['image/png', 'image/jpeg'] as const;
export const companyLogoSchema = z.object({
  dataUrl: z
    .string()
    .max(Math.ceil((COMPANY_LOGO_MAX_BYTES * 4) / 3) + 100, 'El logo debe pesar menos de 1 MB')
    .regex(/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/, 'El logo debe ser PNG o JPG'),
});

export const defaultCompanySchema = z.object({ companyId: z.string().uuid().nullable() });

export type CompanyInput = z.infer<typeof companySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
export type CompanyLogoInput = z.infer<typeof companyLogoSchema>;
export type DefaultCompanyInput = z.infer<typeof defaultCompanySchema>;
