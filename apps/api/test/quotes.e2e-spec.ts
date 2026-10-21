import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, createUser, loginCookies, resetDatabase } from './helpers';

const PASS = 'Clave12345!';
const inTwoDays = () => new Date(Date.now() + 2 * 86_400_000).toISOString();

describe('Cotizaciones (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let seller: string[];
  let seller2: string[];
  let manager: string[];
  let presales: string[];
  let sellerId: string;
  let opportunityId: string;
  let contactId: string;

  const api = () => request(app.getHttpServer());

  const draft = (items: Record<string, unknown>[], extra: Record<string, unknown> = {}) => ({
    currency: 'MXN',
    exchangeRate: 18.5,
    validUntil: new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10),
    terms: 'Términos de prueba',
    items,
    ...extra,
  });

  // Margen 20%: venta 1,000, costo 800.
  const healthyItem = { description: 'Laptop', quantity: 1, unitCost: 800, unitPrice: 1000, discountPct: 0 };
  // Margen 5%: venta 1,000, costo 950.
  const thinItem = { description: 'Servidor', quantity: 1, unitCost: 950, unitPrice: 1000, discountPct: 0 };

  async function newQuote(cookies = seller) {
    const res = await api().post('/api/quotes').set('Cookie', cookies).send({ opportunityId }).expect(201);
    return res.body.id as string;
  }

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    await resetDatabase(prisma);
    sellerId = (await createUser(prisma, 'pyme@test.mx', PASS, ['EJECUTIVO_PYME'], 'Ejecutivo 1')).id;
    await createUser(prisma, 'pyme2@test.mx', PASS, ['EJECUTIVO_PYME'], 'Ejecutivo 2');
    await createUser(prisma, 'gerente@test.mx', PASS, ['GERENTE_COMERCIAL'], 'Gerente');
    await createUser(prisma, 'preventa@test.mx', PASS, ['PREVENTA'], 'Preventa');
    seller = await loginCookies(app, 'pyme@test.mx', PASS);
    seller2 = await loginCookies(app, 'pyme2@test.mx', PASS);
    manager = await loginCookies(app, 'gerente@test.mx', PASS);
    presales = await loginCookies(app, 'preventa@test.mx', PASS);

    const account = await prisma.account.create({ data: { name: 'Cliente Uno', ownerId: sellerId, createdById: sellerId } });
    const contact = await prisma.contact.create({ data: { accountId: account.id, name: 'Ana Compras', isPrimary: true } });
    contactId = contact.id;
    const opp = await prisma.opportunity.create({
      data: {
        name: 'Renovación de equipos',
        pipeline: 'PYME',
        stage: 'SOLICITUD',
        accountId: account.id,
        primaryContactId: contact.id,
        ownerId: sellerId,
        currency: 'MXN',
        createdById: sellerId,
      },
    });
    opportunityId = opp.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('catálogo', () => {
    const product = { sku: 'LAP-01', name: 'Laptop 14"', category: 'HARDWARE', unitCost: 800, listPrice: 1000, currency: 'MXN' };

    it('solo gerencia o compras dan de alta productos', async () => {
      await api().post('/api/products').set('Cookie', seller).send(product).expect(403);
      await api().post('/api/products').set('Cookie', manager).send(product).expect(201);
    });

    it('rechaza un SKU repetido', async () => {
      await api().post('/api/products').set('Cookie', manager).send(product).expect(409);
    });

    it('los ejecutivos consultan el catálogo', async () => {
      const res = await api().get('/api/products?q=LAP').set('Cookie', seller).expect(200);
      expect(res.body).toHaveLength(1);
    });
  });

  describe('alta y borrador', () => {
    it('crea la versión 1 en borrador con los parámetros vigentes', async () => {
      const id = await newQuote();
      const res = await api().get(`/api/quotes/${id}`).set('Cookie', seller).expect(200);
      expect(res.body.status).toBe('BORRADOR');
      expect(res.body.folio).toMatch(/^COT-\d{6}$/);
      expect(res.body.contactId).toBe(contactId);
      expect(res.body.versions).toHaveLength(1);
      expect(Number(res.body.versions[0].minMarginPct)).toBe(15);
      expect(Number(res.body.versions[0].taxRate)).toBe(16);
    });

    it('no deja cotizar la oportunidad de otro ejecutivo ni a preventa', async () => {
      await api().post('/api/quotes').set('Cookie', seller2).send({ opportunityId }).expect(404);
      await api().post('/api/quotes').set('Cookie', presales).send({ opportunityId }).expect(403);
    });

    it('calcula totales y margen al guardar', async () => {
      const id = await newQuote();
      const res = await api()
        .put(`/api/quotes/${id}/draft`)
        .set('Cookie', seller)
        .send(draft([healthyItem, { ...thinItem, quantity: 2, discountPct: 10 }]))
        .expect(200);
      const v = res.body.versions[0];
      // Venta 1,000 + 1,800 = 2,800; costo 800 + 1,900 = 2,700.
      expect(Number(v.subtotal)).toBe(2800);
      expect(Number(v.tax)).toBe(448);
      expect(Number(v.total)).toBe(3248);
      expect(Number(v.marginPct)).toBe(3.57);
      expect(v.items).toHaveLength(2);
    });

    it('no envía a autorización sin partidas', async () => {
      const id = await newQuote();
      await api().post(`/api/quotes/${id}/submit`).set('Cookie', seller).expect(400);
    });
  });

  describe('autorización por margen (FR-05)', () => {
    it('con margen suficiente queda autorizada sin gerente', async () => {
      const id = await newQuote();
      await api().put(`/api/quotes/${id}/draft`).set('Cookie', seller).send(draft([healthyItem])).expect(200);
      const res = await api().post(`/api/quotes/${id}/submit`).set('Cookie', seller).expect(200);
      expect(res.body.status).toBe('AUTORIZADA');
    });

    it('con margen bajo pide autorización; gerencia rechaza y luego autoriza', async () => {
      const id = await newQuote();
      await api().put(`/api/quotes/${id}/draft`).set('Cookie', seller).send(draft([thinItem])).expect(200);
      const pending = await api().post(`/api/quotes/${id}/submit`).set('Cookie', seller).expect(200);
      expect(pending.body.status).toBe('PENDIENTE_APROBACION');

      await api().post(`/api/quotes/${id}/approve`).set('Cookie', seller).send({}).expect(403);
      await api().post(`/api/quotes/${id}/reject-approval`).set('Cookie', manager).send({}).expect(400);
      const back = await api()
        .post(`/api/quotes/${id}/reject-approval`)
        .set('Cookie', manager)
        .send({ comment: 'Sube el precio' })
        .expect(200);
      expect(back.body.status).toBe('BORRADOR');

      await api().post(`/api/quotes/${id}/submit`).set('Cookie', seller).expect(200);
      const ok = await api()
        .post(`/api/quotes/${id}/approve`)
        .set('Cookie', manager)
        .send({ comment: 'Cliente estratégico' })
        .expect(200);
      expect(ok.body.status).toBe('AUTORIZADA');
      expect(ok.body.versions[0].approvedBy.name).toBe('Gerente');
      expect(ok.body.statusHistory[0].comment).toBe('Cliente estratégico');
    });
  });

  describe('envío, versiones y desenlace', () => {
    let quoteId: string;

    beforeAll(async () => {
      quoteId = await newQuote();
      await api().put(`/api/quotes/${quoteId}/draft`).set('Cookie', seller).send(draft([healthyItem])).expect(200);
      await api().post(`/api/quotes/${quoteId}/submit`).set('Cookie', seller).expect(200);
    });

    it('exige programar el seguimiento al enviar (RN-05)', async () => {
      await api().post(`/api/quotes/${quoteId}/send`).set('Cookie', seller).send({ channel: 'CORREO' }).expect(400);
    });

    it('envía, registra la actividad y avanza la oportunidad PyME', async () => {
      const res = await api()
        .post(`/api/quotes/${quoteId}/send`)
        .set('Cookie', seller)
        .send({ channel: 'CORREO', followUp: { subject: 'Llamar para confirmar', dueAt: inTwoDays() } })
        .expect(200);
      expect(res.body.status).toBe('ENVIADA');
      expect(res.body.versions[0].issuedAt).toBeTruthy();
      expect(res.body.activities).toHaveLength(2);
      expect(res.body.nextAction.subject).toBe('Llamar para confirmar');
      const opp = await prisma.opportunity.findUniqueOrThrow({ where: { id: opportunityId } });
      expect(opp.stage).toBe('COTIZACION_ENVIADA');
    });

    it('no edita una cotización enviada', async () => {
      await api().put(`/api/quotes/${quoteId}/draft`).set('Cookie', seller).send(draft([thinItem])).expect(400);
    });

    it('una versión nueva copia las partidas y conserva la enviada', async () => {
      const res = await api().post(`/api/quotes/${quoteId}/versions`).set('Cookie', seller).expect(201);
      expect(res.body.status).toBe('BORRADOR');
      expect(res.body.currentVersion).toBe(2);
      expect(res.body.versions).toHaveLength(2);
      expect(res.body.versions[0].items).toHaveLength(1);
      expect(res.body.versions[1].issuedAt).toBeTruthy();

      await api().post(`/api/quotes/${quoteId}/submit`).set('Cookie', seller).expect(200);
      await api()
        .post(`/api/quotes/${quoteId}/send`)
        .set('Cookie', seller)
        .send({ channel: 'WHATSAPP', followUp: { subject: 'Seguimiento v2', dueAt: inTwoDays() } })
        .expect(200);
    });

    it('rechazar exige motivo', async () => {
      await api().post(`/api/quotes/${quoteId}/outcome`).set('Cookie', seller).send({ status: 'RECHAZADA' }).expect(400);
    });

    it('aceptar cierra la cotización, sus tareas y gana la oportunidad', async () => {
      await api().post(`/api/quotes/${quoteId}/outcome`).set('Cookie', seller).send({ status: 'EN_NEGOCIACION' }).expect(200);
      const res = await api()
        .post(`/api/quotes/${quoteId}/outcome`)
        .set('Cookie', seller)
        .send({ status: 'ACEPTADA', winOpportunity: true })
        .expect(200);
      expect(res.body.status).toBe('ACEPTADA');
      expect(res.body.closedAt).toBeTruthy();
      expect(res.body.nextAction).toBeNull();
      const opp = await prisma.opportunity.findUniqueOrThrow({ where: { id: opportunityId } });
      expect(opp.stage).toBe('GANADA');
      expect(Number(opp.amount)).toBe(1000);
    });

    it('no abre versión nueva de una cotización aceptada', async () => {
      await api().post(`/api/quotes/${quoteId}/versions`).set('Cookie', seller).expect(400);
    });
  });

  describe('vencimiento y consulta', () => {
    it('una enviada con vigencia pasada aparece vencida', async () => {
      // La oportunidad anterior quedó ganada; se usa otra.
      const opp = await prisma.opportunity.create({
        data: {
          name: 'Otra',
          pipeline: 'SOLUCIONES',
          stage: 'CALIFICACION',
          accountId: (await prisma.account.findFirstOrThrow()).id,
          ownerId: sellerId,
          createdById: sellerId,
        },
      });
      const created = await api().post('/api/quotes').set('Cookie', seller).send({ opportunityId: opp.id }).expect(201);
      const id = created.body.id;
      await api().put(`/api/quotes/${id}/draft`).set('Cookie', seller).send(draft([healthyItem])).expect(200);
      await api().post(`/api/quotes/${id}/submit`).set('Cookie', seller).expect(200);
      await api()
        .post(`/api/quotes/${id}/send`)
        .set('Cookie', seller)
        .send({ channel: 'CORREO', followUp: { subject: 'Seguimiento', dueAt: inTwoDays() } })
        .expect(200);
      await prisma.quoteVersion.updateMany({ where: { quoteId: id }, data: { validUntil: new Date('2020-01-01') } });

      const list = await api().get('/api/quotes?status=VENCIDA').set('Cookie', seller).expect(200);
      expect(list.body.items.map((q: { id: string }) => q.id)).toContain(id);
      const opp2 = await prisma.opportunity.findUniqueOrThrow({ where: { id: opp.id } });
      expect(opp2.stage).toBe('CALIFICACION');
    });

    it('cada ejecutivo ve solo sus cotizaciones y preventa ve todas', async () => {
      const mine = await api().get('/api/quotes').set('Cookie', seller).expect(200);
      const other = await api().get('/api/quotes').set('Cookie', seller2).expect(200);
      const all = await api().get('/api/quotes').set('Cookie', presales).expect(200);
      expect(mine.body.total).toBeGreaterThan(0);
      expect(other.body.total).toBe(0);
      expect(all.body.total).toBe(mine.body.total);
    });

    it('la oportunidad lista sus cotizaciones', async () => {
      const res = await api().get(`/api/opportunities/${opportunityId}`).set('Cookie', seller).expect(200);
      expect(res.body.quotes.length).toBeGreaterThan(0);
      expect(res.body.quotes[0].version.number).toBeGreaterThan(0);
    });
  });

  describe('PDF (FR-06)', () => {
    const binary = (res: request.Response, cb: (err: Error | null, body: Buffer) => void) => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => cb(null, Buffer.concat(chunks)));
    };

    it('genera el PDF de la versión vigente y de una anterior', async () => {
      const list = await api().get('/api/quotes?status=ACEPTADA').set('Cookie', seller).expect(200);
      const id = list.body.items[0].id;
      const res = await api().get(`/api/quotes/${id}/pdf`).set('Cookie', seller).buffer(true).parse(binary).expect(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toContain('-v2.pdf');
      expect((res.body as Buffer).subarray(0, 5).toString()).toBe('%PDF-');
      const v1 = await api().get(`/api/quotes/${id}/pdf?version=1`).set('Cookie', seller).buffer(true).parse(binary).expect(200);
      expect(v1.headers['content-disposition']).toContain('-v1.pdf');
    });

    it('no da el PDF de una cotización ajena ni de una versión inexistente', async () => {
      const list = await api().get('/api/quotes?status=ACEPTADA').set('Cookie', seller).expect(200);
      const id = list.body.items[0].id;
      await api().get(`/api/quotes/${id}/pdf`).set('Cookie', seller2).expect(404);
      await api().get(`/api/quotes/${id}/pdf?version=9`).set('Cookie', seller).expect(404);
    });

    it('solo gerencia cambia los datos de la empresa', async () => {
      const company = { name: 'TecZone', legalName: 'TecZone SA de CV', rfc: 'TEC010101AB1', address: 'Monterrey, NL', phone: '81 1234 5678', email: 'ventas@teczone.mx', website: 'teczone.mx' };
      await api().put('/api/settings/company').set('Cookie', seller).send(company).expect(403);
      const res = await api().put('/api/settings/company').set('Cookie', manager).send(company).expect(200);
      expect(res.body.legalName).toBe('TecZone SA de CV');
    });
  });

  describe('parámetros (NFR-08)', () => {
    const settings = { minMarginPct: 25, validityDays: 30, taxRate: 16, usdExchangeRate: 19.1, terms: 'Nuevos términos' };

    it('solo gerencia los cambia y aplican a cotizaciones nuevas', async () => {
      await api().put('/api/settings/quotes').set('Cookie', seller).send(settings).expect(403);
      await api().put('/api/settings/quotes').set('Cookie', manager).send(settings).expect(200);
      const opp = await prisma.opportunity.create({
        data: {
          name: 'Tercera',
          pipeline: 'PYME',
          stage: 'SOLICITUD',
          accountId: (await prisma.account.findFirstOrThrow()).id,
          ownerId: sellerId,
          createdById: sellerId,
        },
      });
      const res = await api().post('/api/quotes').set('Cookie', seller).send({ opportunityId: opp.id }).expect(201);
      expect(Number(res.body.versions[0].minMarginPct)).toBe(25);
      expect(Number(res.body.versions[0].exchangeRate)).toBe(19.1);
      expect(res.body.versions[0].terms).toBe('Nuevos términos');
    });
  });
});
