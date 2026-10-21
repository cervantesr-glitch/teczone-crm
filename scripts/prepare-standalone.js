// Next.js no copia los estáticos al servidor autónomo; se copian aquí tras el build.
const { cpSync, existsSync } = require('node:fs');
const { join } = require('node:path');

const web = join(__dirname, '..', 'apps', 'web');
const target = join(web, '.next', 'standalone', 'apps', 'web');
if (!existsSync(join(target, 'server.js'))) {
  throw new Error('No se encontró el servidor autónomo de Next.js; revisa output: "standalone"');
}
cpSync(join(web, '.next', 'static'), join(target, '.next', 'static'), { recursive: true });
if (existsSync(join(web, 'public'))) cpSync(join(web, 'public'), join(target, 'public'), { recursive: true });
console.log('Estáticos copiados al servidor autónomo');
