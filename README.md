# TecZone CRM

CRM comercial de TecZone. Fase 1: aplicación web, en este orden de entregas: leads, cotizaciones y contratos de servicio. Requisitos en [docs/BRD_CRM_TecZone_v1.1.md](docs/BRD_CRM_TecZone_v1.1.md) y arquitectura en [docs/arquitectura.md](docs/arquitectura.md).

## Requisitos

- Node.js 22 y pnpm 10
- PostgreSQL 16

## Primeros pasos

```bash
pnpm install
cp .env.example .env            # ajusta credenciales y secretos
createdb teczone_crm            # y teczone_crm_test para las pruebas
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

## Estructura

```
apps/web          Next.js (interfaz)
apps/api          NestJS (API REST)
packages/db       Prisma: esquema, migraciones y seed
packages/shared   roles, estados y validaciones compartidas
docs/             BRD y arquitectura
```
