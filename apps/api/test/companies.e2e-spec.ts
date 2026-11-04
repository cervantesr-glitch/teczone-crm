import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, createUser, loginCookies, resetDatabase } from './helpers';

const PASS = 'Clave12345!';
const inTwoDays = () => new Date(Date.now() + 2 * 86_400_000).toISOString();
// PNG de 1x1.
const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

describe('Empresas emisoras (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let seller: string[];
  let manager: string[];
  let sellerId: string;
  let opportunityId: string;
  let teczone: string;
  let filial: string;

  const api = () => request(app.getHttpServer());
  const company = (name: string, rfc: string) => ({ name, legalName: `${name} SA de CV`, rfc, postalCode: '64000', taxRegime: '601 General de Ley Personas Morales' });
  const item = { description: 'Laptop', quantity: 1, unitCost: 800, unitPrice: 1000, discountPct: 0 };
  const draft = (extra: Record<string, unknown> = {}) => ({
    currency: 'MXN',
    exchangeRate: 18.5,
    validUntil: new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10),
    items: [item],
    ...extra,
  });

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    await resetDatabase(prisma);
    sellerId = (await createUser(prisma, 'pyme@test.mx', PASS, ['EJECUTIVO_PYME'], 'Ejecutivo')).id;
    await createUser(prisma, 'gerente@test.mx', PASS, ['GERENTE_COMERCIAL'], 'Gerente');
    seller = await loginCookies(app, 'pyme@test.mx', PASS);
    manager = await loginCookies(app, 'gerente@test.mx', PASS);
    const account = await prisma.account.create({ data: { name: 'Cliente', ownerId: sellerId, createdById: sellerId } });
    opportunityId = (
      await prisma.opportunity.create({
        data: { name: 'Equipos', pipeline: 'PYME', stage: 'SOLICITUD', accountId: account.id, ownerId: sellerId, createdById: sellerId },
      })
    ).id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('solo gerencia da de alta empresas y valida los datos fiscales', async () => {
    await api().post('/api/companies').set('Cookie', seller).send(company('TecZone', 'TEC010101AB1')).expect(403);
    const bad = await api().post('/api/companies').set('Cookie', manager).send(company('Mala', 'XXX')).expect(400);
    expect(JSON.stringify(bad.body)).toContain('RFC inválido');
    teczone = (await api().post('/api/companies').set('Cookie', manager).send(company('TecZone', 'tec010101ab1')).expect(201)).body.id;
    filial = (await api().post('/api/companies').set('Cookie', manager).send(company('TecZone Servicios', 'TSE020202CD2')).expect(201)).body.id;
    const list = await api().get('/api/companies').set('Cookie', seller).expect(200);
    expect(list.body.map((c: { name: string }) => c.name)).toEqual(['TecZone', 'TecZone Servicios']);
    expect(list.body[0].rfc).toBe('TEC010101AB1');
  });

  it('la gerencia asigna la empresa por omisión de cada vendedor', async () => {
    await api().put(`/api/companies/assignments/${sellerId}`).set('Cookie', seller).send({ companyId: filial }).expect(403);
    await api().put(`/api/companies/assignments/${sellerId}`).set('Cookie', manager).send({ companyId: filial }).expect(200);
    const rows = (await api().get('/api/companies/assignments').set('Cookie', manager).expect(200)).body;
    expect(rows.find((u: { id: string }) => u.id === sellerId).defaultCompanyId).toBe(filial);
  });

  it('el vendedor cotiza con su empresa asignada y no la puede cambiar', async () => {
    const res = await api().post('/api/quotes').set('Cookie', seller).send({ opportunityId }).expect(201);
    expect(res.body.company.id).toBe(filial);
    await api().post('/api/quotes').set('Cookie', seller).send({ opportunityId, companyId: teczone }).expect(400);
    await api().put(`/api/quotes/${res.body.id}/draft`).set('Cookie', seller).send(draft({ companyId: teczone })).expect(400);
    // Mandar la misma empresa no es un cambio.
    await api().put(`/api/quotes/${res.body.id}/draft`).set('Cookie', seller).send(draft({ companyId: filial })).expect(200);
  });

  it('la gerencia elige con qué empresa cotizar', async () => {
    const res = await api().post('/api/quotes').set('Cookie', manager).send({ opportunityId, companyId: teczone }).expect(201);
    expect(res.body.company.id).toBe(teczone);
    const saved = await api().put(`/api/quotes/${res.body.id}/draft`).set('Cookie', manager).send(draft({ companyId: filial })).expect(200);
    expect(saved.body.company.id).toBe(filial);
    const list = await api().get(`/api/quotes?companyId=${filial}`).set('Cookie', manager).expect(200);
    expect(list.body.items.every((q: { company: { id: string } }) => q.company.id === filial)).toBe(true);
  });

  it('el supervisor elige empresa al cotizar pero no administra empresas ni parámetros', async () => {
    await createUser(prisma, 'super@test.mx', PASS, ['SUPERVISOR'], 'Supervisor');
    const supervisor = await loginCookies(app, 'super@test.mx', PASS);
    const res = await api().post('/api/quotes').set('Cookie', supervisor).send({ opportunityId, companyId: teczone }).expect(201);
    expect(res.body.company.id).toBe(teczone);
    const saved = await api().put(`/api/quotes/${res.body.id}/draft`).set('Cookie', supervisor).send(draft({ companyId: filial })).expect(200);
    expect(saved.body.company.id).toBe(filial);
    await api().post('/api/companies').set('Cookie', supervisor).send(company('Otra', 'OTR040404GH4')).expect(403);
    await api().put(`/api/companies/assignments/${sellerId}`).set('Cookie', supervisor).send({ companyId: teczone }).expect(403);
    await api()
      .put('/api/settings/quotes')
      .set('Cookie', supervisor)
      .send({ minMarginPct: 1, validityDays: 15, taxRate: 16, usdExchangeRate: 18, terms: '' })
      .expect(403);
  });

  it('lo emitido conserva los datos de la empresa aunque luego se editen', async () => {
    const created = await api().post('/api/quotes').set('Cookie', seller).send({ opportunityId }).expect(201);
    const id = created.body.id;
    await api().put(`/api/quotes/${id}/draft`).set('Cookie', seller).send(draft()).expect(200);
    await api().post(`/api/quotes/${id}/submit`).set('Cookie', seller).expect(200);
    const sent = await api()
      .post(`/api/quotes/${id}/send`)
      .set('Cookie', seller)
      .send({ channel: 'CORREO', followUp: { subject: 'Llamar', dueAt: inTwoDays() } })
      .expect(200);
    expect(sent.body.versions[0].companySnapshot).toMatchObject({ name: 'TecZone Servicios', rfc: 'TSE020202CD2', postalCode: '64000' });
    await api().patch(`/api/companies/${filial}`).set('Cookie', manager).send({ legalName: 'Otra Razón SA' }).expect(200);
    const after = await api().get(`/api/quotes/${id}`).set('Cookie', seller).expect(200);
    expect(after.body.versions[0].companySnapshot.legalName).toBe('TecZone Servicios SA de CV');
    expect(after.body.company.legalName).toBe('Otra Razón SA');
  });

  it('guarda y sirve el logo de la empresa; rechaza archivos que no son imagen', async () => {
    await api().put(`/api/companies/${teczone}/logo`).set('Cookie', seller).send({ dataUrl: PNG }).expect(403);
    const fake = `data:image/png;base64,${Buffer.from('no soy imagen').toString('base64')}`;
    await api().put(`/api/companies/${teczone}/logo`).set('Cookie', manager).send({ dataUrl: fake }).expect(400);
    await api().put(`/api/companies/${teczone}/logo`).set('Cookie', manager).send({ dataUrl: PNG }).expect(204);
    const logo = await api().get(`/api/companies/${teczone}/logo`).set('Cookie', seller).expect(200);
    expect(logo.headers['content-type']).toBe('image/png');
    // El PDF se genera con el logo de la empresa.
    const q = (await api().get(`/api/quotes?companyId=${teczone}`).set('Cookie', manager).expect(200)).body.items[0];
    if (q) await api().get(`/api/quotes/${q.id}/pdf`).set('Cookie', manager).expect(200);
    await api().delete(`/api/companies/${teczone}/logo`).set('Cookie', manager).expect(204);
    await api().get(`/api/companies/${teczone}/logo`).set('Cookie', seller).expect(404);
  });

  it('no se elimina una empresa con cotizaciones; se desactiva', async () => {
    await api().post('/api/quotes').set('Cookie', manager).send({ opportunityId, companyId: teczone }).expect(201);
    const del = await api().delete(`/api/companies/${teczone}`).set('Cookie', manager).expect(409);
    expect(del.body.message).toContain('Desactívala');
    // La base también lo impide.
    await expect(prisma.company.delete({ where: { id: teczone } })).rejects.toThrow();
    await api().patch(`/api/companies/${teczone}`).set('Cookie', manager).send({ active: false }).expect(200);
    const active = (await api().get('/api/companies').set('Cookie', manager).expect(200)).body;
    expect(active.map((c: { id: string }) => c.id)).toEqual([filial]);
    const all = (await api().get('/api/companies?includeInactive=true').set('Cookie', manager).expect(200)).body;
    expect(all.find((c: { id: string }) => c.id === teczone)).toMatchObject({ active: false, quoteCount: 1 });
    // Una inactiva ya no se elige.
    await api().post('/api/quotes').set('Cookie', manager).send({ opportunityId, companyId: teczone }).expect(400);
  });

  it('no desactiva la empresa asignada a usuarios ni la última activa', async () => {
    const res = await api().patch(`/api/companies/${filial}`).set('Cookie', manager).send({ active: false }).expect(409);
    expect(res.body.message).toContain('empresa por omisión');
    await api().put(`/api/companies/assignments/${sellerId}`).set('Cookie', manager).send({ companyId: null }).expect(200);
    const managerId = (await prisma.user.findUniqueOrThrow({ where: { email: 'gerente@test.mx' } })).id;
    await prisma.user.update({ where: { id: managerId }, data: { defaultCompanyId: null } });
    const last = await api().patch(`/api/companies/${filial}`).set('Cookie', manager).send({ active: false }).expect(409);
    expect(last.body.message).toContain('al menos una empresa activa');
  });

  it('elimina una empresa sin cotizaciones', async () => {
    const id = (await api().post('/api/companies').set('Cookie', manager).send(company('Temporal', 'TEM030303EF3')).expect(201)).body.id;
    await api().delete(`/api/companies/${id}`).set('Cookie', manager).expect(204);
  });

  it('un usuario nuevo queda con la primera empresa activa', async () => {
    await createUser(prisma, 'admin@test.mx', PASS, ['ADMIN']);
    const admin = await loginCookies(app, 'admin@test.mx', PASS);
    const res = await api()
      .post('/api/users')
      .set('Cookie', admin)
      .send({ email: 'nuevo@test.mx', name: 'Nuevo', password: PASS, roles: ['EJECUTIVO_TECH'] })
      .expect(201);
    expect(res.body.defaultCompanyId).toBe(filial);
  });
});
