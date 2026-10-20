import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Role } from '@teczone/shared';
import argon2 from 'argon2';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

// Requiere una base de pruebas migrada (su nombre debe contener "test"): las tablas se vacían.
export function assertTestDatabase() {
  if (!/test/.test(new URL(process.env.DATABASE_URL ?? 'mysql://x/').pathname)) {
    throw new Error('DATABASE_URL debe apuntar a una base de pruebas (p. ej. teczone_crm_test)');
  }
}

process.env.JWT_ACCESS_SECRET ??= 'test-secret';
// Las pruebas inician sesión muchas veces; se levanta el límite por minuto.
process.env.LOGIN_RATE_LIMIT = '1000';

export async function createTestApp() {
  assertTestDatabase();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  return { app, prisma: app.get(PrismaService) };
}

export async function resetDatabase(prisma: PrismaService) {
  const tables = [
    'user_roles',
    'refresh_tokens',
    'audit_log',
    'lead_status_history',
    'lead_products_interest',
    'lead_tags',
    'activities',
    'leads',
    'users',
    'lead_sources',
    'disqualification_reasons',
  ];
  await prisma.$transaction([
    prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0'),
    ...tables.map((t) => prisma.$executeRawUnsafe(`TRUNCATE TABLE ${t}`)),
    prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1'),
  ]);
}

export async function createUser(prisma: PrismaService, email: string, password: string, roles: Role[], name = email) {
  return prisma.user.create({
    data: {
      email,
      name,
      passwordHash: await argon2.hash(password),
      roles: { create: roles.map((role) => ({ role })) },
    },
  });
}

export async function loginCookies(app: INestApplication, email: string, password: string) {
  const res = await request(app.getHttpServer()).post('/api/auth/login').send({ email, password });
  if (res.status !== 200) throw new Error(`login falló para ${email}: ${res.status}`);
  return res.get('Set-Cookie') ?? [];
}
