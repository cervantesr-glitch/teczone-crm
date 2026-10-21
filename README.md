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

Una sola app web Node.js del plan Business, conectada a este repositorio, con la base MySQL de Hostinger. `server.js` aplica las migraciones pendientes, crea el administrador inicial si no existe, levanta la API en `127.0.0.1:4000` (solo interna) y sirve la web en el puerto 3000.

| Campo en hPanel | Valor |
| --- | --- |
| Framework | Other |
| Directorio raíz | `./` |
| Node.js | 22 |
| Gestor de paquetes | pnpm |
| Comando de build | `build:prod` |
| Archivo de entrada | `server.js` |

Cada push a `main` vuelve a publicar. La guía completa, con las variables de entorno, está en [docs/deploy-hostinger.md](docs/deploy-hostinger.md).

## Estructura

```
apps/web          Next.js (interfaz)
apps/api          NestJS (API REST)
packages/db       Prisma (MySQL): esquema, migraciones y seed
packages/shared   roles, estados y validaciones compartidas
docs/             BRD y arquitectura
```
