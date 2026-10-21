# Arquitectura

Resumen de la propuesta aprobada para la fase 1 (web). El documento completo, con el modelo de datos de cotizaciones y contratos, está en el proyecto de Claude: "CRM TecZone · Arquitectura y modelo de datos (Fase 1 web)".

## Piezas

| Pieza | Tecnología | Responsabilidad |
| --- | --- | --- |
| `apps/web` | Next.js 15, Tailwind CSS 4 | Interfaz. Solo consume la API; `/api/*` se reenvía a la API para compartir origen y cookies. |
| `apps/api` | NestJS 11, REST + OpenAPI (`/docs`) | Toda la lógica de negocio. La misma API servirá a la app móvil. |
| `packages/db` | Prisma 6, MySQL 8 / MariaDB (Hostinger) | Esquema, migraciones y datos iniciales. |
| `packages/shared` | TypeScript, Zod | Roles, estados y validaciones compartidas por web, API y la futura app móvil. |

## Alojamiento

Hostinger, plan de apps web Node.js con MySQL administrado (decisión del 20 oct 2026). Web y API se publican como dos apps. Como no hay proceso aparte para tareas en segundo plano, las alertas (SLA de leads, renovaciones) correrán como tareas programadas dentro de la API (`@nestjs/schedule`), con registro en base de datos para no duplicar avisos (RN-12).

## Sesión

- `POST /api/auth/login` valida con argon2 y entrega un JWT de acceso (15 min) y un refresh token rotativo (7 días) en cookies `httpOnly`.
- El JWT también se acepta como `Authorization: Bearer` para la app móvil.
- `POST /api/auth/refresh` revoca el refresh token usado y emite uno nuevo; reutilizar uno revocado falla.
- Desactivar un usuario o cambiar su contraseña cierra todas sus sesiones.
- Inicio de sesión limitado a 10 intentos por minuto por IP (`LOGIN_RATE_LIMIT`).

## Roles

Los 8 roles del BRD v1.1 (sección 6) están en `packages/shared/src/roles.ts`: Administrador, Dirección, Gerente Comercial, Ejecutivo PyME, Ejecutivo Tech, Preventa, Customer Success y Compras/Operaciones. Un usuario puede tener varios. Las rutas se restringen con `@Roles(...)`; sin decorador basta con tener sesión, y `@Public()` las abre.

## Acceso a cuentas y oportunidades

La matriz está en `apps/api/src/common/access.ts` (propuesta, BRD v1.1 D11). Ven cuentas los roles comerciales, Preventa y Customer Success. Dirección, gerencia y Preventa ven todas las oportunidades; cada ejecutivo, solo las suyas. Solo el responsable o un gerente modifica una oportunidad, y solo gerencia reabre una cerrada.

La conversión (`POST /api/leads/:id/convert`, FR-25) corre en una transacción: crea o reutiliza la cuenta (el RFC es único y un duplicado responde 409 con el `accountId` existente) y el contacto, crea la oportunidad en la primera etapa de su pipeline y marca el lead como convertido.

## Cotizaciones

Una oportunidad puede tener varias cotizaciones (folio `COT-000000`), y cada una, varias versiones. Cada versión fija partidas, TC, IVA, vigencia, términos y el margen mínimo vigente al crearla; las anteriores a la vigente cubren el estado "Sustituida" del BRD. El cálculo de totales y margen vive en `packages/shared/src/quotes.ts` y lo usan la API y la web.

El PDF (`GET /api/quotes/:id/pdf?version=n`) se genera en la API con pdfkit, sin navegador, para que funcione en el hosting de Node de Hostinger. Lleva el logo de `apps/api/assets/logo.png`, los datos de la empresa de `/api/settings/company`, las partidas sin costos ni margen, los totales con importe con letra y los términos. Lo no autorizado sale con marca de agua "BORRADOR".

Flujo: Borrador → (margen menor al mínimo) Pendiente de autorización → Autorizada → Enviada → En negociación → Aceptada o Rechazada. Una enviada cuya vigencia pasa queda Vencida al consultarla. Enviar exige programar el seguimiento (RN-05) y, en PyME, mueve la oportunidad a "Cotización enviada". Autorizan y cambian parámetros (`/api/settings/quotes`) Administración y Gerencia Comercial; el catálogo lo mantienen además Compras/Operaciones.

## Orden de entregas (BRD v1.1)

1. Leads, conversión a cuenta, contacto y oportunidad
2. Generación y gestión de cotizaciones
3. Elaboración y seguimiento de contratos de servicio
