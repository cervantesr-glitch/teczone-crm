// Arranque de producción en Hostinger (app web Node.js): un solo proceso con la API
// interna en 127.0.0.1:4000 y la web en el puerto público (PORT, 3000 por omisión).
const { spawnSync } = require('node:child_process');
const { join } = require('node:path');

process.env.NODE_ENV = 'production';
process.env.API_HOST ??= '127.0.0.1';
process.env.API_PORT ??= '4000';
process.env.COOKIE_SECURE ??= 'true';

const db = join(__dirname, 'packages', 'db');
const bin = (pkg, file) => join(require.resolve(`${pkg}/package.json`, { paths: [db] }), '..', file);

// Con el mismo Node que corre este proceso; no depende de que pnpm esté en el PATH.
function run(args, label) {
  const res = spawnSync(process.execPath, args, { cwd: db, stdio: 'inherit', env: process.env });
  if (res.status !== 0) throw new Error(`Falló: ${label}`);
}

// Migraciones pendientes y datos iniciales (idempotente) antes de aceptar tráfico.
run([bin('prisma', 'build/index.js'), 'migrate', 'deploy'], 'migraciones');
if (process.env.SEED_ADMIN_PASSWORD) run([bin('tsx', 'dist/cli.mjs'), 'prisma/seed.ts'], 'datos iniciales');

require('./apps/api/dist/main.js');

const web = join(__dirname, 'apps', 'web', '.next', 'standalone', 'apps', 'web', 'server.js');
process.env.PORT ??= '3000';
process.env.HOSTNAME = '0.0.0.0';
require(web);
