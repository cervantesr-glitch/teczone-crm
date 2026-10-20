import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, createUser, loginCookies, resetDatabase } from './helpers';

const PASS = 'Clave12345!';

describe('Leads (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let manager: string[];
  let seller: string[];
  let seller2: string[];
  let direction: string[];
  let presales: string[];
  let sellerId: string;
  let sourceId: string;
  let reasonId: string;

  const api = () => request(app.getHttpServer());

  const newLead = (overrides: Record<string, unknown> = {}) => ({
    companyName: 'Ferretería El Clavo',
    contactName: 'Ana López',
    email: 'ana@elclavo.mx',
    phone: '55 1234 5678',
    interestType: 'PYME',
    sourceId,
    productsOfInterest: [{ category: 'HARDWARE', description: 'Laptops', quantity: 5 }],
    ...overrides,
  });

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    await resetDatabase(prisma);
    await createUser(prisma, 'gerente@test.mx', PASS, ['GERENTE_COMERCIAL'], 'Gerente');
    sellerId = (await createUser(prisma, 'pyme@test.mx', PASS, ['EJECUTIVO_PYME'], 'Ejecutivo 1')).id;
    await createUser(prisma, 'pyme2@test.mx', PASS, ['EJECUTIVO_PYME'], 'Ejecutivo 2');
    await createUser(prisma, 'direccion@test.mx', PASS, ['DIRECCION'], 'Dirección');
    await createUser(prisma, 'preventa@test.mx', PASS, ['PREVENTA'], 'Preventa');
    sourceId = (await prisma.leadSource.create({ data: { name: 'Formulario web' } })).id;
    reasonId = (await prisma.disqualificationReason.create({ data: { name: 'Sin presupuesto' } })).id;
    manager = await loginCookies(app, 'gerente@test.mx', PASS);
    seller = await loginCookies(app, 'pyme@test.mx', PASS);
    seller2 = await loginCookies(app, 'pyme2@test.mx', PASS);
    direction = await loginCookies(app, 'direccion@test.mx', PASS);
    presales = await loginCookies(app, 'preventa@test.mx', PASS);
  });

  afterAll(async () => {
    await app.close();
  });

  it('crea un lead con folio, responsable, SLA e historial (AC-17)', async () => {
    const res = await api().post('/api/leads').set('Cookie', seller).send(newLead());
    expect(res.status).toBe(201);
    expect(res.body.folio).toMatch(/^LD-\d{6}$/);
    expect(res.body.owner.id).toBe(sellerId);
    expect(res.body.status).toBe('NUEVO');
    expect(res.body.firstContactDueAt).toBeTruthy();
    expect(res.body.productsOfInterest).toHaveLength(1);
    expect(res.body.statusHistory[0].toStatus).toBe('NUEVO');
  });

  it('exige correo o teléfono', async () => {
    const res = await api()
      .post('/api/leads')
      .set('Cookie', seller)
      .send(newLead({ email: null, phone: null, companyName: 'Otra empresa' }));
    expect(res.status).toBe(400);
  });

  it('advierte duplicados por teléfono normalizado y permite confirmarlos (AC-17)', async () => {
    const dup = newLead({ companyName: 'Otra razón social', email: 'otro@correo.mx', phone: '+52 (55) 1234-5678' });
    const res = await api().post('/api/leads').set('Cookie', seller2).send(dup);
    expect(res.status).toBe(409);
    expect(res.body.duplicates[0].matchedOn).toContain('teléfono');

    const forced = await api()
      .post('/api/leads')
      .set('Cookie', seller2)
      .send({ ...dup, confirmDuplicate: true });
    expect(forced.status).toBe(201);
  });

  it('cada ejecutivo ve solo sus leads y los sin asignar; gerencia y dirección ven todos', async () => {
    await api()
      .post('/api/leads')
      .set('Cookie', manager)
      .send(newLead({ companyName: 'Sin dueño SA', email: 'x@sindueno.mx', phone: '3311112222', ownerId: null }))
      .expect(201);

    const mine = await api().get('/api/leads').set('Cookie', seller);
    const names = mine.body.items.map((l: { companyName: string }) => l.companyName);
    expect(names).toContain('Ferretería El Clavo');
    expect(names).toContain('Sin dueño SA');
    expect(names).not.toContain('Otra razón social');

    expect((await api().get('/api/leads').set('Cookie', manager)).body.total).toBe(3);
    expect((await api().get('/api/leads').set('Cookie', direction)).body.total).toBe(3);
    expect((await api().get('/api/leads').set('Cookie', presales)).status).toBe(403);
  });

  it('un administrador sin rol de ventas crea leads sin asignar', async () => {
    await createUser(prisma, 'admin@test.mx', PASS, ['ADMIN'], 'Admin');
    const admin = await loginCookies(app, 'admin@test.mx', PASS);
    const res = await api()
      .post('/api/leads')
      .set('Cookie', admin)
      .send(newLead({ companyName: 'Capturado por admin', email: 'a@admin.mx', phone: '8110002000' }));
    expect(res.status).toBe(201);
    expect(res.body.owner).toBeNull();
    await prisma.lead.update({ where: { id: res.body.id }, data: { deletedAt: new Date() } });
  });

  it('dirección consulta pero no edita', async () => {
    const res = await api().post('/api/leads').set('Cookie', direction).send(newLead({ companyName: 'X' }));
    expect(res.status).toBe(403);
  });

  it('busca por empresa, folio y teléfono', async () => {
    const byName = await api().get('/api/leads').query({ q: 'clavo' }).set('Cookie', manager);
    expect(byName.body.total).toBe(1);
    const folio = byName.body.items[0].folio;
    const byFolio = await api().get('/api/leads').query({ q: folio }).set('Cookie', manager);
    expect(byFolio.body.items[0].folio).toBe(folio);
    const byPhone = await api().get('/api/leads').query({ q: '5512345678' }).set('Cookie', manager);
    expect(byPhone.body.total).toBe(2);
  });

  it('un ejecutivo toma un lead sin asignar pero no reasigna otros', async () => {
    const list = await api().get('/api/leads').query({ ownerId: 'none' }).set('Cookie', seller);
    const unassigned = list.body.items[0];
    const take = await api().put(`/api/leads/${unassigned.id}/owner`).set('Cookie', seller).send({ ownerId: sellerId });
    expect(take.status).toBe(200);
    expect(take.body.owner.id).toBe(sellerId);

    const steal = await api()
      .put(`/api/leads/${unassigned.id}/owner`)
      .set('Cookie', seller2)
      .send({ ownerId: null });
    expect(steal.status).toBe(404);
  });

  describe('ciclo de vida', () => {
    let leadId: string;

    beforeAll(async () => {
      const res = await api().get('/api/leads').query({ q: 'clavo' }).set('Cookie', seller);
      leadId = res.body.items[0].id;
    });

    it('registra primer contacto al pasar a Contactado (AC-18)', async () => {
      const res = await api()
        .post(`/api/leads/${leadId}/status`)
        .set('Cookie', seller)
        .send({ status: 'CONTACTADO', comment: 'Llamada inicial' });
      expect(res.status).toBe(200);
      expect(res.body.firstContactAt).toBeTruthy();
      expect(res.body.statusHistory[0]).toMatchObject({ fromStatus: 'NUEVO', toStatus: 'CONTACTADO' });
    });

    it('rechaza transiciones no permitidas', async () => {
      const res = await api().post(`/api/leads/${leadId}/status`).set('Cookie', seller).send({ status: 'NUEVO' });
      expect(res.status).toBe(400);
    });

    it('no deja calificar sin registrar la calificación', async () => {
      await api()
        .post(`/api/leads/${leadId}/status`)
        .set('Cookie', seller)
        .send({ status: 'EN_CALIFICACION' })
        .expect(200);
      const res = await api().post(`/api/leads/${leadId}/status`).set('Cookie', seller).send({ status: 'CALIFICADO' });
      expect(res.status).toBe(400);
    });

    it('calcula la puntuación BANT y permite calificar', async () => {
      const q = await api()
        .put(`/api/leads/${leadId}/qualification`)
        .set('Cookie', seller)
        .send({ budget: true, authority: true, need: true, timeline: false, notes: 'Compra en Q1' });
      expect(q.body.score).toBe(75);
      const res = await api().post(`/api/leads/${leadId}/status`).set('Cookie', seller).send({ status: 'CALIFICADO' });
      expect(res.body.status).toBe('CALIFICADO');
    });

    it('otro ejecutivo no puede editar el lead', async () => {
      const res = await api().patch(`/api/leads/${leadId}`).set('Cookie', seller2).send({ need: 'x' });
      expect(res.status).toBe(404);
    });

    it('registra actividades y la próxima acción', async () => {
      await api()
        .post(`/api/leads/${leadId}/activities`)
        .set('Cookie', seller)
        .send({ type: 'LLAMADA', subject: 'Revisión de necesidades' })
        .expect(201);
      const noDue = await api()
        .post(`/api/leads/${leadId}/activities`)
        .set('Cookie', seller)
        .send({ type: 'TAREA', subject: 'Enviar catálogo' });
      expect(noDue.status).toBe(400);
      const due = new Date(Date.now() + 86400000).toISOString();
      const task = await api()
        .post(`/api/leads/${leadId}/activities`)
        .set('Cookie', seller)
        .send({ type: 'TAREA', subject: 'Enviar catálogo', dueAt: due });
      expect(task.status).toBe(201);

      const lead = await api().get(`/api/leads/${leadId}`).set('Cookie', seller);
      expect(lead.body.activities).toHaveLength(2);
      expect(lead.body.nextAction.subject).toBe('Enviar catálogo');

      await api()
        .post(`/api/leads/${leadId}/activities/${task.body.id}/toggle`)
        .set('Cookie', seller)
        .expect(200);
      const after = await api().get(`/api/leads/${leadId}`).set('Cookie', seller);
      expect(after.body.nextAction).toBeNull();
    });

    it('exige motivo y notas para descalificar y permite reactivar (AC-18)', async () => {
      const bad = await api().post(`/api/leads/${leadId}/status`).set('Cookie', seller).send({ status: 'DESCALIFICADO' });
      expect(bad.status).toBe(400);

      const ok = await api()
        .post(`/api/leads/${leadId}/status`)
        .set('Cookie', seller)
        .send({ status: 'DESCALIFICADO', disqualificationReasonId: reasonId, disqualificationNotes: 'Sin fondos este año' });
      expect(ok.body.status).toBe('DESCALIFICADO');
      expect(ok.body.disqualificationReason.name).toBe('Sin presupuesto');

      const back = await api().post(`/api/leads/${leadId}/status`).set('Cookie', seller).send({ status: 'CONTACTADO' });
      expect(back.body.status).toBe('CONTACTADO');
      expect(back.body.disqualificationReason).toBeNull();
    });

    it('no permite convertir desde este endpoint', async () => {
      const res = await api().post(`/api/leads/${leadId}/status`).set('Cookie', seller).send({ status: 'CONVERTIDO' });
      expect(res.status).toBe(400);
    });
  });

  it('resume leads por estado y SLA vencido', async () => {
    const overdue = await prisma.lead.findFirst({ where: { companyName: 'Otra razón social' } });
    await prisma.lead.update({ where: { id: overdue!.id }, data: { firstContactDueAt: new Date(Date.now() - 1000) } });
    const res = await api().get('/api/leads/summary').set('Cookie', manager);
    expect(res.body.overdueFirstContact).toBe(1);
    expect(res.body.byStatus.NUEVO).toBe(2);
  });

  it('solo gerencia elimina leads', async () => {
    const lead = await prisma.lead.findFirst({ where: { companyName: 'Otra razón social' } });
    expect((await api().delete(`/api/leads/${lead!.id}`).set('Cookie', seller2)).status).toBe(403);
    expect((await api().delete(`/api/leads/${lead!.id}`).set('Cookie', manager)).status).toBe(204);
    expect((await api().get(`/api/leads/${lead!.id}`).set('Cookie', manager)).status).toBe(404);
  });
});
