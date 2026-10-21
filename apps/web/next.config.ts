import path from 'node:path';
import type { NextConfig } from 'next';

const apiUrl = process.env.API_URL ?? 'http://127.0.0.1:4000';

const nextConfig: NextConfig = {
  // Servidor autónomo para producción (Hostinger arranca server.js en la raíz del repo).
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../..'),
  // La web solo habla con la API; /api/* se reenvía para compartir origen y cookies.
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${apiUrl}/api/:path*` }];
  },
};

export default nextConfig;
