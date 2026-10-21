// Arranque de producción en Hostinger (app web Node.js): la web en el puerto público y la
// API interna en 127.0.0.1:4000 como proceso hijo.
const { spawn, spawnSync } = require('node:child_process');
const net = require('node:net');
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

// Hostinger corre la app con LiteSpeed, que toma el primer listen() del proceso como el
// puerto público e ignora los demás; por eso la API va en su propio proceso. Hostinger
// puede levantar varias instancias: solo una arranca la API y las demás la reusan.
let api = null;
function apiListening() {
  return new Promise((resolve) => {
    const socket = net.connect(Number(process.env.API_PORT), process.env.API_HOST);
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', () => resolve(false));
  });
}
async function ensureApi() {
  if (!api && !(await apiListening())) {
    api = spawn(process.execPath, [join(__dirname, 'apps', 'api', 'dist', 'main.js')], { stdio: 'inherit', env: process.env });
    api.once('exit', () => { api = null; });
  }
  setTimeout(ensureApi, 5000).unref();
}
process.once('exit', () => api?.kill());
process.once('SIGTERM', () => process.exit(0));
ensureApi();

const web = join(__dirname, 'apps', 'web', '.next', 'standalone', 'apps', 'web', 'server.js');
process.env.PORT ??= '3000';
process.env.HOSTNAME = '0.0.0.0';
require(web);
