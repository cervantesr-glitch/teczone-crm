# TecZone CRM

- Todo el texto visible para usuarios, mensajes de error, comentarios y documentación va en español.
- Monorepo pnpm: `apps/web` (Next.js), `apps/api` (NestJS), `packages/db` (Prisma), `packages/shared` (Zod y constantes).
- Compila `@teczone/shared` y `@teczone/db` antes de typecheck o pruebas de las apps.
- Base de datos: MySQL (Hostinger). No uses funciones exclusivas de PostgreSQL.
- Las pruebas e2e de la API vacían la base: usa siempre `TEST_DATABASE_URL`.
- Los requisitos están en `docs/BRD_CRM_TecZone_v1.1.md`; cita el ID (FR-xx, RN-xx) en commits y PRs.
- Toda ruta de la API requiere sesión salvo `@Public()`; restringe por rol con `@Roles(...)`.
