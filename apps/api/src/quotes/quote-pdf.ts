import { resolve } from 'node:path';
import PDFDocument from 'pdfkit';
import { amountInWords, type CompanySettings } from '@teczone/shared';

// Datos ya resueltos de una versión para imprimir (FR-06). Sin costos ni margen.
export interface QuotePdfData {
  folio: string;
  draft: boolean;
  date: Date;
  validUntil: Date;
  currency: 'MXN' | 'USD';
  exchangeRate: number;
  taxRate: number;
  subtotal: number;
  tax: number;
  total: number;
  terms: string | null;
  notes: string | null;
  company: CompanySettings;
  client: { name: string; legalName: string | null; rfc: string | null; city: string | null };
  contact: { name: string; title: string | null; email: string | null; phone: string | null } | null;
  seller: { name: string; email: string };
  items: { sku: string | null; description: string; quantity: number; unitPrice: number; discountPct: number; lineTotal: number }[];
}

const LOGO = resolve(__dirname, '../../assets/logo.png');
const NAVY = '#0b2a6f';
const GRAY = '#4b5563';
const LIGHT = '#eef2f9';

const money = (n: number, currency: string) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(n);
const date = (d: Date) =>
  new Intl.DateTimeFormat('es-MX', { dateStyle: 'long', timeZone: 'UTC' }).format(d);

export function renderQuotePdf(data: QuotePdfData): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'LETTER', margin: 50, bufferPages: true, info: { Title: `Cotización ${data.folio}` } });
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((ok) => doc.on('end', () => ok(Buffer.concat(chunks))));

  const left = doc.page.margins.left;
  const width = doc.page.width - left - doc.page.margins.right;
  const bottom = () => doc.page.height - doc.page.margins.bottom - 30;

  // ---------- Encabezado ----------
  doc.image(LOGO, left, 40, { fit: [120, 82] });
  const c = data.company;
  doc.font('Helvetica-Bold').fontSize(13).fillColor(NAVY).text(c.name, left + 170, 45, { width: width - 170, align: 'right' });
  doc.font('Helvetica').fontSize(8.5).fillColor(GRAY);
  for (const line of [c.legalName, c.rfc && `RFC ${c.rfc}`, c.address, [c.phone, c.email].filter(Boolean).join(' · '), c.website]) {
    if (line) doc.text(line, { width: width - 170, align: 'right' });
  }

  let y = 135;
  doc.rect(left, y, width, 46).fill(NAVY);
  doc.fillColor('white').font('Helvetica-Bold').fontSize(16).text('COTIZACIÓN', left + 12, y + 9);
  doc.font('Helvetica').fontSize(10).text(data.folio, left + 12, y + 29);
  doc.fontSize(9).text(`Fecha: ${date(data.date)}`, left, y + 10, { width: width - 12, align: 'right' });
  doc.text(`Vigente hasta: ${date(data.validUntil)}`, left, y + 25, { width: width - 12, align: 'right' });

  // ---------- Cliente y ejecutivo ----------
  y += 60;
  const colW = (width - 20) / 2;
  const block = (x: number, title: string, lines: (string | null | false | undefined)[]) => {
    doc.font('Helvetica-Bold').fontSize(8).fillColor(NAVY).text(title, x, y);
    doc.font('Helvetica').fontSize(9).fillColor('black');
    let first = true;
    for (const l of lines.filter(Boolean) as string[]) {
      doc.font(first ? 'Helvetica-Bold' : 'Helvetica').text(l, x, undefined, { width: colW });
      first = false;
    }
    return doc.y;
  };
  const clientEnd = block(left, 'CLIENTE', [
    data.client.legalName ?? data.client.name,
    data.client.legalName && data.client.legalName !== data.client.name ? data.client.name : null,
    data.client.rfc && `RFC ${data.client.rfc}`,
    data.client.city,
    data.contact && `Atención: ${data.contact.name}${data.contact.title ? `, ${data.contact.title}` : ''}`,
    data.contact && [data.contact.email, data.contact.phone].filter(Boolean).join(' · '),
  ]);
  const sellerEnd = block(left + colW + 20, 'EJECUTIVO', [data.seller.name, data.seller.email]);
  y = Math.max(clientEnd, sellerEnd) + 18;

  // ---------- Partidas ----------
  const cols = [
    { label: '#', w: 22, align: 'left' as const },
    { label: 'Descripción', w: width - 22 - 50 - 85 - 45 - 90, align: 'left' as const },
    { label: 'Cant.', w: 50, align: 'right' as const },
    { label: 'P. unitario', w: 85, align: 'right' as const },
    { label: 'Desc.', w: 45, align: 'right' as const },
    { label: 'Importe', w: 90, align: 'right' as const },
  ];
  const header = () => {
    doc.rect(left, y, width, 20).fill(NAVY);
    let x = left;
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('white');
    for (const col of cols) {
      doc.text(col.label, x + 4, y + 6, { width: col.w - 8, align: col.align });
      x += col.w;
    }
    y += 20;
  };
  header();
  doc.font('Helvetica').fontSize(9);
  data.items.forEach((item, i) => {
    const desc = item.sku ? `${item.sku}  ${item.description}` : item.description;
    const h = Math.max(doc.heightOfString(desc, { width: cols[1].w - 8 }), 11) + 10;
    if (y + h > bottom()) {
      doc.addPage();
      y = doc.page.margins.top;
      header();
      doc.font('Helvetica').fontSize(9);
    }
    if (i % 2) doc.rect(left, y, width, h).fill(LIGHT);
    const cells = [
      String(i + 1),
      desc,
      String(item.quantity),
      money(item.unitPrice, data.currency),
      item.discountPct ? `${item.discountPct}%` : '',
      money(item.lineTotal, data.currency),
    ];
    let x = left;
    doc.fillColor('black');
    cells.forEach((text, j) => {
      doc.text(text, x + 4, y + 5, { width: cols[j].w - 8, align: cols[j].align });
      x += cols[j].w;
    });
    y += h;
  });
  doc.moveTo(left, y).lineTo(left + width, y).strokeColor('#cbd5e1').lineWidth(0.5).stroke();

  // ---------- Totales ----------
  if (y + 110 > bottom()) {
    doc.addPage();
    y = doc.page.margins.top;
  }
  y += 10;
  const totalsX = left + width - 220;
  const row = (label: string, value: string, bold = false) => {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 11 : 9.5).fillColor(bold ? NAVY : 'black');
    doc.text(label, totalsX, y, { width: 110 });
    doc.text(value, totalsX + 110, y, { width: 110, align: 'right' });
    y += bold ? 18 : 15;
  };
  row('Subtotal', money(data.subtotal, data.currency));
  row(`IVA ${data.taxRate}%`, money(data.tax, data.currency));
  doc.moveTo(totalsX, y - 2).lineTo(totalsX + 220, y - 2).strokeColor(NAVY).lineWidth(1).stroke();
  y += 3;
  row('Total', money(data.total, data.currency), true);
  doc.font('Helvetica').fontSize(8.5).fillColor(GRAY).text(`(${amountInWords(data.total, data.currency)})`, left, y + 2, { width, align: 'right' });
  y = doc.y + 4;
  if (data.currency === 'USD') {
    doc.text(`Precios en dólares estadounidenses. Tipo de cambio de referencia: ${money(data.exchangeRate, 'MXN')} por USD.`, left, y, { width, align: 'right' });
    y = doc.y;
  }

  // ---------- Notas y términos ----------
  const section = (title: string, body: string | null) => {
    if (!body) return;
    y += 16;
    if (y + 40 > bottom()) {
      doc.addPage();
      y = doc.page.margins.top;
    }
    doc.font('Helvetica-Bold').fontSize(9).fillColor(NAVY).text(title, left, y);
    doc.font('Helvetica').fontSize(8.5).fillColor('black').text(body, left, undefined, { width });
    y = doc.y;
  };
  section('Notas', data.notes);
  section('Términos y condiciones', data.terms);

  // ---------- Marca de agua y pie ----------
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    if (data.draft) {
      doc.save();
      doc.rotate(-35, { origin: [doc.page.width / 2, doc.page.height / 2] });
      doc.font('Helvetica-Bold').fontSize(70).fillColor('#dc2626').opacity(0.12);
      doc.text('BORRADOR', 0, doc.page.height / 2 - 40, { width: doc.page.width, align: 'center', lineBreak: false });
      doc.restore();
    }
    // Sin margen inferior para que el pie no abra otra página.
    const margin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.font('Helvetica').fontSize(7.5).fillColor(GRAY).opacity(1);
    doc.text(`${data.folio} · Página ${i - range.start + 1} de ${range.count}`, left, doc.page.height - 35, {
      width,
      align: 'right',
      lineBreak: false,
    });
    doc.page.margins.bottom = margin;
  }

  doc.end();
  return done;
}
