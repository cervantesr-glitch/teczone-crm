import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, createUser, loginCookies, resetDatabase } from './helpers';

const PASS = 'Clave12345!';

describe('Conversión de leads, cuentas y oportunidades (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let seller: string[];
  let seller2: string[];
  let manager: string[];
  let presales: string[];
  let sourceId: string;

  const api = () => request(app.getHttpServer());

  async function qualifiedLead(cookies: string[], companyName: string, extra: Record<string, unknown> = {}) {
    const created = await api()
      .post('/api/leads')
      .set('Cookie', cookies)
      .send({
        companyName,
        contactName: `Contacto de ${companyName}`,
        email: `${companyName.toLowerCase().replace(/\W/g, '')}@correo.mx`,
        interestType: 'PYME',
        sourceId,
        estimatedBudget: 150000,
        currency: 'MXN',
        confirmDuplicate: true,
        ...extra,
      })
      .expect(201);
    const id = created.body.id;
    for (const status of ['CONTACTADO', 'EN_CALIFICACION']) {
      await api().post(`/api/leads/${id}/status`).set('Cookie', cookies).send({ status }).expect(200);
    }
    await api()
      .put(`/api/leads/${id}/qualification`)
      .set('Cookie', cookies)
      .send({ budget: true, authority: true, need: true, timeline: true })
      .expect(200);
    await api().post(`/api/leads/${id}/status`).set('Cookie', cookies).send({ status: 'CALIFICADO' }).expect(200);
    return id as string;
  }

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    await resetDatabase(prisma);
    await createUser(prisma, 'pyme@test.mx', PASS, ['EJECUTIVO_PYME'], 'Ejecutivo 1');
    await createUser(prisma, 'pyme2@test.mx', PASS, ['EJECUTIVO_PYME'], 'Ejecutivo 2');
    await createUser(prisma, 'gerente@test.mx', PASS, ['GERENTE_COMERCIAL'], 'Gerente');
    await createUser(prisma, 'preventa@test.mx', PASS, ['PREVENTA'], 'Preventa');
    sourceId = (await prisma.leadSource.create({ data: { name: 'Referido' } })).id;
    seller = await loginCookies(app, 'pyme@test.mx', PASS);
    seller2 = await loginCookies(app, 'pyme2@test.mx', PASS);
    manager = await loginCookies(app, 'gerente@test.mx', PASS);
    presales = await loginCookies(app, 'preventa@test.mx', PASS);
  });

  afterAll(async () => {
    await app.close();
  });

  let accountId: string;
  let contactId: string;
  let opportunityId: string;

  it('no convierte un lead que no está calificado', async () => {
    const lead = await api()
      .post('/api/leads')
      .set('Cookie', seller)
      .send({ companyName: 'Sin calificar', contactName: 'X', email: 'x@sin.mx', sourceId })
      .expect(201);
    const res = await api()
      .post(`/api/leads/${lead.body.id}/convert`)
      .set('Cookie', seller)
      .send({
        account: { mode: 'new', data: { name: 'Sin calificar' } },
        contact: { mode: 'new', data: { name: 'X' } },
        opportunity: { pipeline: 'PYME', name: 'Prueba' },
      });
    expect(res.status).toBe(400);
  });

  it('convierte en cuenta, contacto y oportunidad nuevos (AC-20)', async () => {
    const leadId = await qualifiedLead(seller, 'Clínica Dental Sonrisa');
    const res = await api()
      .post(`/api/leads/${leadId}/convert`)
      .set('Cookie', seller)
      .send({
        account: { mode: 'new', data: { name: 'Clínica Dental Sonrisa', rfc: 'CDS010101AB1' } },
        contact: { mode: 'new', data: { name: 'Dra. Paola Méndez', email: 'paola@sonrisa.mx', decisionRole: 'ECONOMICO' } },
        opportunity: { pipeline: 'PYME', name: 'Equipos de recepción' },
      });
    expect(res.status).toBe(200);
    expect(res.body.lead.status).toBe('CONVERTIDO');
    expect(res.body.lead.convertedOpportunity.folio).toMatch(/^OP-\d{6}$/);
    opportunityId = res.body.opportunityId;
    accountId = res.body.lead.convertedAccount.id;

    const opp = await api().get(`/api/opportunities/${opportunityId}`).set('Cookie', seller);
    expect(opp.body).toMatchObject({ pipeline: 'PYME', stage: 'SOLICITUD', probability: 10, currency: 'MXN' });
    expect(Number(opp.body.amount)).toBe(150000);
    expect(opp.body.primaryContact.name).toBe('Dra. Paola Méndez');
    expect(opp.body.sourceLeads[0].id).toBe(leadId);
    contactId = opp.body.primaryContact.id;

    const account = await api().get(`/api/accounts/${accountId}`).set('Cookie', seller);
    expect(account.body.contacts[0]).toMatchObject({ name: 'Dra. Paola Méndez', isPrimary: true });
  });

  it('el lead convertido queda de solo consulta (RN-13)', async () => {
    const lead = await prisma.lead.findFirst({ where: { companyName: 'Clínica Dental Sonrisa' } });
    const res = await api().patch(`/api/leads/${lead!.id}`).set('Cookie', seller).send({ need: 'cambio' });
    expect(res.status).toBe(400);
  });

  it('rechaza una cuenta nueva con RFC ya registrado y permite vincular la existente', async () => {
    const leadId = await qualifiedLead(seller, 'Sonrisa sucursal norte');
    const dup = await api()
      .post(`/api/leads/${leadId}/convert`)
      .set('Cookie', seller)
      .send({
        account: { mode: 'new', data: { name: 'Otra', rfc: 'CDS010101AB1' } },
        contact: { mode: 'new', data: { name: 'Y' } },
        opportunity: { pipeline: 'PYME', name: 'Sucursal norte' },
      });
    expect(dup.status).toBe(409);
    expect(dup.body.accountId).toBe(accountId);

    const ok = await api()
      .post(`/api/leads/${leadId}/convert`)
      .set('Cookie', seller)
      .send({
        account: { mode: 'existing', accountId },
        contact: { mode: 'existing', contactId },
        opportunity: { pipeline: 'SOLUCIONES', name: 'Red de sucursal' },
      });
    expect(ok.status).toBe(200);
    const opp = await api().get(`/api/opportunities/${ok.body.opportunityId}`).set('Cookie', seller);
    expect(opp.body.stage).toBe('CALIFICACION');
    expect(await prisma.account.count()).toBe(1);
  });

  it('rechaza un contacto que no pertenece a la cuenta', async () => {
    const other = await api().post('/api/accounts').set('Cookie', seller).send({ name: 'Otra cuenta' }).expect(201);
    const leadId = await qualifiedLead(seller, 'Tercer lead');
    const res = await api()
      .post(`/api/leads/${leadId}/convert`)
      .set('Cookie', seller)
      .send({
        account: { mode: 'existing', accountId: other.body.id },
        contact: { mode: 'existing', contactId },
        opportunity: { pipeline: 'PYME', name: 'X' },
      });
    expect(res.status).toBe(400);
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    expect(lead!.status).toBe('CALIFICADO');
  });

  it('cada ejecutivo ve sus oportunidades; gerencia y preventa ven todas', async () => {
    expect((await api().get('/api/opportunities').set('Cookie', seller)).body.total).toBe(2);
    expect((await api().get('/api/opportunities').set('Cookie', seller2)).body.total).toBe(0);
    expect((await api().get('/api/opportunities').set('Cookie', manager)).body.total).toBe(2);
    expect((await api().get('/api/opportunities').set('Cookie', presales)).body.total).toBe(2);
    expect((await api().get(`/api/opportunities/${opportunityId}`).set('Cookie', seller2)).status).toBe(404);
  });

  it('valida etapas por pipeline y registra historial', async () => {
    const wrong = await api()
      .post(`/api/opportunities/${opportunityId}/stage`)
      .set('Cookie', seller)
      .send({ stage: 'DEMO_POC' });
    expect(wrong.status).toBe(400);

    const ok = await api()
      .post(`/api/opportunities/${opportunityId}/stage`)
      .set('Cookie', seller)
      .send({ stage: 'COSTEO_MARGEN', comment: 'Pidiendo precios a mayorista' });
    expect(ok.body).toMatchObject({ stage: 'COSTEO_MARGEN', probability: 25 });
    expect(ok.body.stageHistory[0]).toMatchObject({ fromStage: 'SOLICITUD', toStage: 'COSTEO_MARGEN' });
  });

  it('exige motivo para perder y solo gerencia reabre', async () => {
    const noReason = await api()
      .post(`/api/opportunities/${opportunityId}/stage`)
      .set('Cookie', seller)
      .send({ stage: 'PERDIDA' });
    expect(noReason.status).toBe(400);

    const lost = await api()
      .post(`/api/opportunities/${opportunityId}/stage`)
      .set('Cookie', seller)
      .send({ stage: 'PERDIDA', lostReason: 'Eligió otro proveedor por precio' });
    expect(lost.body.closedAt).toBeTruthy();

    const reopenSeller = await api()
      .post(`/api/opportunities/${opportunityId}/stage`)
      .set('Cookie', seller)
      .send({ stage: 'NEGOCIACION' });
    expect(reopenSeller.status).toBe(403);

    const reopen = await api()
      .post(`/api/opportunities/${opportunityId}/stage`)
      .set('Cookie', manager)
      .send({ stage: 'NEGOCIACION' });
    expect(reopen.body).toMatchObject({ stage: 'NEGOCIACION', closedAt: null, lostReason: null });
  });

  it('preventa consulta oportunidades pero no las modifica', async () => {
    const res = await api().patch(`/api/opportunities/${opportunityId}`).set('Cookie', presales).send({ name: 'x' });
    expect(res.status).toBe(403);
  });

  it('agrega contactos y cambia el contacto principal', async () => {
    const c = await api()
      .post(`/api/accounts/${accountId}/contacts`)
      .set('Cookie', seller)
      .send({ name: 'Ing. Luis Peña', decisionRole: 'TECNICO', isPrimary: true });
    expect(c.status).toBe(201);
    const account = await api().get(`/api/accounts/${accountId}`).set('Cookie', seller);
    const primary = account.body.contacts.filter((x: { isPrimary: boolean }) => x.isPrimary);
    expect(primary).toHaveLength(1);
    expect(primary[0].name).toBe('Ing. Luis Peña');
  });
});
