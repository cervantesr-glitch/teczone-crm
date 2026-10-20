# TecZone CRM

CRM comercial de TecZone. Fase 1: aplicación web, en este orden de entregas: leads, cotizaciones y contratos de servicio. Requisitos en [docs/BRD_CRM_TecZone_v1.1.md](docs/BRD_CRM_TecZone_v1.1.md) y arquitectura en [docs/arquitectura.md](docs/arquitectura.md).

## Requisitos

- Node.js 22 y pnpm 10
- MySQL 8 (o MariaDB 10.6+), la base que ofrece Hostinger

## Primeros pasos

```bash
pnpm install
cp .env.example .env            # ajusta credenciales y secretos
# crea las bases teczone_crm y teczone_crm_test (utf8mb4) en MySQL
pnpm --filter @teczone/shared build
pnpm db:migrate                 # crea las tablas
pnpm db:seed                    # catálogos y usuario administrador inicial
pnpm dev                        # web en :3000, API en :4000 (documentación en :4000/docs)
```

## Pruebas

Las pruebas de la API usan `TEST_DATABASE_URL` y vacían esa base en cada corrida; se niegan a correr si el nombre de la base no contiene `test`.

```bash
DATABASE_URL=$TEST_DATABASE_URL pnpm db:deploy   # una vez, para crear las tablas de prueba
pnpm test
```

## Despliegue en Hostinger

Plan Business de apps web Node.js con su MySQL. Se publican dos apps desde este repositorio:

| App | Directorio | Build | Arranque |
| --- | --- | --- | --- |
| API | raíz | `pnpm install && pnpm --filter @teczone/shared build && pnpm --filter @teczone/db build && pnpm db:deploy && pnpm --filter @teczone/api build` | `node apps/api/dist/main.js` |
| Web | raíz | `pnpm install && pnpm --filter @teczone/shared build && pnpm --filter @teczone/web build` | `pnpm --filter @teczone/web start` |

Variables de entorno: las de `.env.example`, con `COOKIE_SECURE=true` y `API_URL` apuntando a la URL pública de la API. La guía detallada llegará con el PR de despliegue.

## Estructura

```
apps/web          Next.js (interfaz)
apps/api          NestJS (API REST)
packages/db       Prisma (MySQL): esquema, migraciones y seed
packages/shared   roles, estados y validaciones compartidas
docs/             BRD y arquitectura
```
