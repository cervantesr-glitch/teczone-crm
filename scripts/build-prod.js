// Build de producción sin volver a invocar pnpm: Hostinger ejecuta el script con una
// versión de pnpm distinta a la de packageManager y un pnpm anidado se niega a correr.
const { spawnSync } = require('node:child_process');
const { join } = require('node:path');

const root = join(__dirname, '..');
const steps = [
  ['packages/shared', 'tsc', ['-p', 'tsconfig.json']],
  ['packages/db', 'prisma', ['generate']],
  ['packages/db', 'tsc', ['-p', 'tsconfig.json']],
  ['apps/api', 'nest', ['build']],
  ['apps/web', 'next', ['build']],
];

for (const [dir, bin, args] of steps) {
  console.log(`\n> ${dir}: ${bin} ${args.join(' ')}`);
  const cwd = join(root, dir);
  const res = spawnSync(join(cwd, 'node_modules', '.bin', bin), args, { cwd, stdio: 'inherit', env: process.env });
  if (res.status !== 0) {
    console.error(`Falló el build en ${dir}`);
    process.exit(res.status ?? 1);
  }
}

require('./prepare-standalone');
