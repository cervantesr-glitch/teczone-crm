import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import argon2 from 'argon2';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

// Requiere una base de pruebas migrada (su nombre debe contener "test"): las tablas se vacían.
if (!/test/.test(new URL(process.env.DATABASE_URL ?? 'postgresql://x/').pathname)) {
  throw new Error('DATABASE_URL debe apuntar a una base de pruebas (p. ej. teczone_crm_test)');
}
process.env.JWT_ACCESS_SECRET ??= 'test-secret';
// Estas pruebas inician sesión muchas veces; se levanta el límite por minuto.
process.env.LOGIN_RATE_LIMIT = '1000';

const ADMIN = { email: 'admin@test.mx', password: 'Admin12345!' };
const SELLER = { email: 'ventas@test.mx', password: 'Ventas12345!' };

describe('Autenticación y roles (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    await prisma.$executeRawUnsafe(
      'TRUNCATE users, user_roles, refresh_tokens, audit_log, leads, lead_status_history, activities CASCADE',
    );
    await prisma.user.create({
      data: {
        email: ADMIN.email,
        name: 'Admin',
        passwordHash: await argon2.hash(ADMIN.password),
        roles: { create: [{ role: 'ADMIN' }] },
      },
    });
    await prisma.user.create({
      data: {
        email: SELLER.email,
        name: 'Vendedor',
        passwordHash: await argon2.hash(SELLER.password),
        roles: { create: [{ role: 'EJECUTIVO_PYME' }] },
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  const login = (creds: { email: string; password: string }) =>
    request(app.getHttpServer()).post('/api/auth/login').send(creds);

  it('rechaza credenciales incorrectas sin revelar si el correo existe', async () => {
    const wrongPass = await login({ email: ADMIN.email, password: 'otra-cosa' });
    const unknown = await login({ email: 'nadie@test.mx', password: 'otra-cosa' });
    expect(wrongPass.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrongPass.body.message).toBe(unknown.body.message);
  });

  it('valida el formato del login', async () => {
    const res = await login({ email: 'no-es-correo', password: '' });
    expect(res.status).toBe(400);
  });

  it('inicia sesión, entrega cookies y responde /auth/me', async () => {
    const res = await login(SELLER);
    expect(res.status).toBe(200);
    expect(res.body.user.roles).toEqual(['EJECUTIVO_PYME']);
    const cookies = res.get('Set-Cookie') ?? [];
    expect(cookies.some((c) => c.startsWith('tz_access=') && c.includes('HttpOnly'))).toBe(true);
    expect(cookies.some((c) => c.startsWith('tz_refresh=') && c.includes('Path=/api/auth'))).toBe(true);

    const me = await request(app.getHttpServer()).get('/api/auth/me').set('Cookie', cookies);
    expect(me.status).toBe(200);
    expect(me.body.email).toBe(SELLER.email);
  });

  it('acepta el token como Bearer (para la app móvil)', async () => {
    const { body } = await login(SELLER);
    const me = await request(app.getHttpServer()).get('/api/auth/me').set('Authorization', `Bearer ${body.accessToken}`);
    expect(me.status).toBe(200);
  });

  it('exige sesión en rutas protegidas', async () => {
    const res = await request(app.getHttpServer()).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('rota el refresh token y no permite reutilizarlo', async () => {
    const res = await login(SELLER);
    const cookies = res.get('Set-Cookie') ?? [];
    const first = await request(app.getHttpServer()).post('/api/auth/refresh').set('Cookie', cookies);
    expect(first.status).toBe(200);
    const reused = await request(app.getHttpServer()).post('/api/auth/refresh').set('Cookie', cookies);
    expect(reused.status).toBe(401);
  });

  it('solo el administrador gestiona usuarios', async () => {
    const seller = await login(SELLER);
    const denied = await request(app.getHttpServer()).get('/api/users').set('Cookie', seller.get('Set-Cookie') ?? []);
    expect(denied.status).toBe(403);

    const admin = await login(ADMIN);
    const adminCookies = admin.get('Set-Cookie') ?? [];
    const created = await request(app.getHttpServer())
      .post('/api/users')
      .set('Cookie', adminCookies)
      .send({ email: 'preventa@test.mx', name: 'Preventa', password: 'Preventa12345', roles: ['PREVENTA'] });
    expect(created.status).toBe(201);
    expect(created.body.roles).toEqual(['PREVENTA']);
    expect(created.body.passwordHash).toBeUndefined();

    const dup = await request(app.getHttpServer())
      .post('/api/users')
      .set('Cookie', adminCookies)
      .send({ email: 'preventa@test.mx', name: 'Otra', password: 'Preventa12345', roles: ['PREVENTA'] });
    expect(dup.status).toBe(409);
  });

  it('un usuario desactivado no puede iniciar sesión ni renovar', async () => {
    const seller = await login(SELLER);
    const sellerCookies = seller.get('Set-Cookie') ?? [];
    const admin = await login(ADMIN);
    const res = await request(app.getHttpServer())
      .patch(`/api/users/${seller.body.user.id}`)
      .set('Cookie', admin.get('Set-Cookie') ?? [])
      .send({ active: false });
    expect(res.status).toBe(200);

    expect((await login(SELLER)).status).toBe(401);
    const refresh = await request(app.getHttpServer()).post('/api/auth/refresh').set('Cookie', sellerCookies);
    expect(refresh.status).toBe(401);
  });

  it('el administrador no puede quitarse su propio rol', async () => {
    const admin = await login(ADMIN);
    const res = await request(app.getHttpServer())
      .patch(`/api/users/${admin.body.user.id}`)
      .set('Cookie', admin.get('Set-Cookie') ?? [])
      .send({ roles: ['GERENTE_COMERCIAL'] });
    expect(res.status).toBe(400);
  });
});
