import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

// Catálogos iniciales propuestos; se ajustan con la decisión D16 del BRD.
const LEAD_SOURCES = [
  'Formulario web',
  'Correo',
  'WhatsApp',
  'Llamada',
  'Feria o evento',
  'Referido',
  'Mayorista o fabricante',
  'Campaña',
];

const DISQUALIFICATION_REASONS = [
  'Sin presupuesto',
  'Sin necesidad real',
  'No es tomador de decisión',
  'Fuera de cobertura',
  'Compró con la competencia',
  'Sin respuesta',
  'Duplicado',
];

async function main() {
  for (const name of LEAD_SOURCES) {
    await prisma.leadSource.upsert({ where: { name }, update: {}, create: { name } });
  }
  for (const name of DISQUALIFICATION_REASONS) {
    await prisma.disqualificationReason.upsert({ where: { name }, update: {}, create: { name } });
  }

  const email = (process.env.SEED_ADMIN_EMAIL ?? 'admin@teczone.mx').toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password) {
    throw new Error('Define SEED_ADMIN_PASSWORD para crear el usuario administrador');
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    await prisma.user.create({
      data: {
        email,
        name: process.env.SEED_ADMIN_NAME ?? 'Administrador',
        passwordHash: await argon2.hash(password),
        roles: { create: [{ role: 'ADMIN' }] },
      },
    });
    console.log(`Usuario administrador creado: ${email}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
