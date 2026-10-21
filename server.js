// Arranque de producción en Hostinger (app web Node.js). LiteSpeed solo admite un listen()
// por proceso, así que un único servidor HTTP atiende /api/* con NestJS y el resto con Next.js,
// sin puertos internos ni proxy.
const { spawnSync } = require('node:child_process');
const { createServer } = require('node:http');
const { join } = require('node:path');

process.env.NODE_ENV = 'production';
process.env.COOKIE_SECURE ??= 'true';
process.env.PORT ??= '3000';

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

async function main() {
  // API: NestJS sin listen() propio; responde dentro del mismo servidor HTTP.
  const apiDir = join(__dirname, 'apps', 'api');
  const fromApi = (m) => require(require.resolve(m, { paths: [apiDir] }));
  fromApi('reflect-metadata');
  const { NestFactory } = fromApi('@nestjs/core');
  const { AppModule } = require('./apps/api/dist/app.module.js');
  const { configureApp } = require('./apps/api/dist/app.setup.js');
  const api = await NestFactory.create(AppModule);
  configureApp(api);
  await api.init();
  const handleApi = api.getHttpAdapter().getInstance();

  // Web: Next.js del servidor autónomo, con la configuración que dejó el build.
  const webDir = join(__dirname, 'apps', 'web', '.next', 'standalone', 'apps', 'web');
  const { config } = require('./apps/web/.next/required-server-files.json');
  process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(config);
  process.chdir(webDir);
  const nextMod = require(require.resolve('next', { paths: [webDir] }));
  const next = nextMod.default ?? nextMod;
  const web = next({ dir: webDir, dev: false, conf: config, hostname: '0.0.0.0', port: Number(process.env.PORT) });
  await web.prepare();
  const handleWeb = web.getRequestHandler();

  createServer((req, res) => {
    if (req.url === '/api' || req.url.startsWith('/api/')) handleApi(req, res);
    else handleWeb(req, res);
  }).listen(Number(process.env.PORT), '0.0.0.0', () => {
    console.log(`CRM listo en el puerto ${process.env.PORT} (web y API en el mismo servidor)`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
