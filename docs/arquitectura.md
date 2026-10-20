# Arquitectura

Resumen de la propuesta aprobada para la fase 1 (web). El documento completo, con el modelo de datos de cotizaciones y contratos, está en el proyecto de Claude: "CRM TecZone · Arquitectura y modelo de datos (Fase 1 web)".

## Piezas

| Pieza | Tecnología | Responsabilidad |
| --- | --- | --- |
| `apps/web` | Next.js 15, Tailwind CSS 4 | Interfaz. Solo consume la API; `/api/*` se reenvía a la API para compartir origen y cookies. |
| `apps/api` | NestJS 11, REST + OpenAPI (`/docs`) | Toda la lógica de negocio. La misma API servirá a la app móvil. |
| `packages/db` | Prisma 6, PostgreSQL 16 | Esquema, migraciones y datos iniciales. |
| `packages/shared` | TypeScript, Zod | Roles, estados y validaciones compartidas por web, API y la futura app móvil. |

## Sesión

- `POST /api/auth/login` valida con argon2 y entrega un JWT de acceso (15 min) y un refresh token rotativo (7 días) en cookies `httpOnly`.
- El JWT también se acepta como `Authorization: Bearer` para la app móvil.
- `POST /api/auth/refresh` revoca el refresh token usado y emite uno nuevo; reutilizar uno revocado falla.
- Desactivar un usuario o cambiar su contraseña cierra todas sus sesiones.
- Inicio de sesión limitado a 10 intentos por minuto por IP (`LOGIN_RATE_LIMIT`).

## Roles

Los 8 roles del BRD v1.1 (sección 6) están en `packages/shared/src/roles.ts`: Administrador, Dirección, Gerente Comercial, Ejecutivo PyME, Ejecutivo Tech, Preventa, Customer Success y Compras/Operaciones. Un usuario puede tener varios. Las rutas se restringen con `@Roles(...)`; sin decorador basta con tener sesión, y `@Public()` las abre.

## Orden de entregas (BRD v1.1)

1. Leads (en curso)
2. Generación y gestión de cotizaciones
3. Elaboración y seguimiento de contratos de servicio
