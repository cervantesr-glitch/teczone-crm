'use client';

import {
  computeLine,
  computeQuoteTotals,
  MAX_LINE_MARGIN_PCT,
  marginFromPrice,
  priceFromMargin,
  QUOTE_STATUS_LABELS,
  REVISABLE_QUOTE_STATUSES,
} from '@teczone/shared';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activities } from '@/components/activities';
import { MarginBadge, QuoteStatusBadge } from '@/components/quote-badge';
import { Button, Card, ErrorText, Field, Input, LoadingPage, Modal, Select, Textarea } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { formatDate, formatDateTime, formatDay, formatMoney, toLocalInput } from '@/lib/format';
import { canApproveQuotes, canEditOpportunity } from '@/lib/permissions';
import type { Product, QuoteDetail, QuoteVersion } from '@/lib/quotes';
import { useSession } from '@/lib/session';

const errorMessage = (e: unknown, fallback: string) =>
  e instanceof ApiError ? e.errors?.map((x) => x.message).join('. ') || e.message : fallback;

interface Line {
  key: string;
  productId: string | null;
  sku: string | null;
  description: string;
  quantity: string;
  unitCost: string;
  // Se captura el margen; el precio se calcula a partir del costo. Solo sin costo se captura el precio.
  marginPct: string;
  unitPrice: string;
  discountPct: string;
}

interface Draft {
  contactId: string;
  currency: 'MXN' | 'USD';
  exchangeRate: string;
  validUntil: string;
  terms: string;
  notes: string;
  lines: Line[];
}

const newKey = () => Math.random().toString(36).slice(2);

const toDraft = (q: QuoteDetail, v: QuoteVersion): Draft => ({
  contactId: q.contactId ?? '',
  currency: v.currency,
  exchangeRate: v.exchangeRate,
  validUntil: v.validUntil.slice(0, 10),
  terms: v.terms ?? '',
  notes: v.notes ?? '',
  lines: v.items.map((i) => ({
    key: i.id,
    productId: i.productId,
    sku: i.sku,
    description: i.description,
    quantity: String(Number(i.quantity)),
    unitCost: String(Number(i.unitCost)),
    marginPct: String(marginFromPrice(Number(i.unitCost), Number(i.unitPrice))),
    unitPrice: String(Number(i.unitPrice)),
    discountPct: String(Number(i.discountPct)),
  })),
});

const numericLine = (l: Line) => ({
  quantity: Number(l.quantity) || 0,
  unitCost: Number(l.unitCost) || 0,
  unitPrice: Number(l.unitPrice) || 0,
  discountPct: Number(l.discountPct) || 0,
});

const hasCost = (l: Line) => Number(l.unitCost) > 0;
const invalidMargin = (l: Line) => hasCost(l) && !(Number(l.marginPct) <= MAX_LINE_MARGIN_PCT);

// Aplica un cambio a la partida y recalcula el precio cuando cambia el costo o el margen.
function patchLine(l: Line, patch: Partial<Line>): Line {
  const next = { ...l, ...patch };
  if (!('unitCost' in patch) && !('marginPct' in patch)) return next;
  const cost = Number(next.unitCost) || 0;
  if (cost <= 0) return next;
  // Al pasar de sin costo a con costo, conserva el precio capturado y deriva el margen.
  if ('unitCost' in patch && !hasCost(l)) {
    return { ...next, marginPct: String(marginFromPrice(cost, Number(next.unitPrice) || 0)) };
  }
  const price = priceFromMargin(cost, Number(next.marginPct) || 0);
  return Number.isFinite(price) ? { ...next, unitPrice: String(price) } : next;
}

// Cotización con versiones, margen, autorización y seguimiento (FR-03 a FR-11).
export default function QuotePage() {
  const { id } = useParams<{ id: string }>();
  const user = useSession();
  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [viewNumber, setViewNumber] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<'send' | 'accept' | 'reject' | 'approve' | 'return' | null>(null);

  const apply = useCallback((q: QuoteDetail) => {
    setQuote(q);
    setViewNumber(q.currentVersion);
    const current = q.versions.find((v) => v.number === q.currentVersion)!;
    setDraft(q.status === 'BORRADOR' ? toDraft(q, current) : null);
    setDirty(false);
  }, []);

  const load = useCallback(async () => {
    try {
      apply(await api<QuoteDetail>(`/quotes/${id}`));
    } catch (e) {
      setError(errorMessage(e, 'No se pudo cargar la cotización'));
    }
  }, [id, apply]);

  useEffect(() => {
    load();
  }, [load]);

  async function run(path: string, body?: unknown) {
    setBusy(true);
    try {
      apply(await api<QuoteDetail>(`/quotes/${id}${path}`, { method: 'POST', body: body ? JSON.stringify(body) : undefined }));
      setError(null);
      setModal(null);
      return true;
    } catch (e) {
      setError(errorMessage(e, 'No se pudo completar la acción'));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft() {
    if (!draft) return false;
    if (draft.lines.some(invalidMargin)) {
      setError('El margen de cada partida debe ser menor a 100%');
      return false;
    }
    setBusy(true);
    try {
      const saved = await api<QuoteDetail>(`/quotes/${id}/draft`, {
        method: 'PUT',
        body: JSON.stringify({
          contactId: draft.contactId || null,
          currency: draft.currency,
          exchangeRate: Number(draft.exchangeRate),
          validUntil: draft.validUntil,
          terms: draft.terms || null,
          notes: draft.notes || null,
          items: draft.lines.map((l) => ({
            productId: l.productId,
            sku: l.sku,
            description: l.description,
            ...numericLine(l),
          })),
        }),
      });
      apply(saved);
      setError(null);
      return true;
    } catch (e) {
      setError(errorMessage(e, 'No se pudo guardar la cotización'));
      return false;
    } finally {
      setBusy(false);
    }
  }

  if (!quote) return error ? <ErrorText>{error}</ErrorText> : <LoadingPage />;

  const editable = canEditOpportunity(user, quote.ownerId);
  const approver = canApproveQuotes(user);
  const current = quote.versions.find((v) => v.number === quote.currentVersion)!;
  const shown = quote.versions.find((v) => v.number === viewNumber) ?? current;
  const editing = !!draft && editable && shown.number === current.number;
  const minMargin = Number(current.minMarginPct);

  return (
    <div className="space-y-4">
      <div>
        <Link href={`/oportunidades/${quote.opportunity.id}`} className="inline-flex items-center gap-1 text-sm text-slate-500 transition hover:text-brand">
          ← {quote.opportunity.folio} · {quote.opportunity.name}
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {quote.folio} <span className="text-slate-400">v{quote.currentVersion}</span>
          </h1>
          <QuoteStatusBadge status={quote.status} />
        </div>
        <p className="text-sm text-slate-500">
          <Link href={`/cuentas/${quote.opportunity.account.id}`} className="link">
            {quote.opportunity.account.name}
          </Link>{' '}
          · Responsable: {quote.owner.name}
          {quote.sentAt && ` · Primer envío ${formatDate(quote.sentAt)}`}
        </p>
      </div>

      <ErrorText>{error}</ErrorText>

      <StatusBanner quote={quote} current={current} />

      {editable || approver ? (
        <div className="flex flex-wrap gap-2">
          {editing && (
            <>
              <Button variant="secondary" onClick={saveDraft} disabled={busy || !dirty}>
                Guardar borrador
              </Button>
              <Button
                onClick={async () => {
                  if (await saveDraft()) await run('/submit');
                }}
                disabled={busy || !draft!.lines.length}
              >
                {computeQuoteTotals(draft!.lines.map(numericLine), Number(current.taxRate)).marginPct < minMargin
                  ? 'Enviar a autorización'
                  : 'Terminar y autorizar'}
              </Button>
            </>
          )}
          {quote.status === 'PENDIENTE_APROBACION' && approver && (
            <>
              <Button onClick={() => setModal('approve')}>Autorizar</Button>
              <Button variant="secondary" onClick={() => setModal('return')}>
                Regresar con comentarios
              </Button>
            </>
          )}
          {editable && quote.status === 'AUTORIZADA' && <Button onClick={() => setModal('send')}>Registrar envío al cliente</Button>}
          {editable && quote.status === 'ENVIADA' && (
            <Button variant="secondary" onClick={() => run('/outcome', { status: 'EN_NEGOCIACION' })} disabled={busy}>
              En negociación
            </Button>
          )}
          {editable && ['ENVIADA', 'EN_NEGOCIACION'].includes(quote.status) && (
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setModal('accept')}>
              Aceptada
            </Button>
          )}
          {editable && ['ENVIADA', 'EN_NEGOCIACION', 'VENCIDA'].includes(quote.status) && (
            <Button variant="secondary" onClick={() => setModal('reject')}>
              Rechazada
            </Button>
          )}
          {editable && REVISABLE_QUOTE_STATUSES.includes(quote.status) && (
            <Button variant="ghost" onClick={() => run('/versions')} disabled={busy}>
              Crear versión {quote.currentVersion + 1}
            </Button>
          )}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <a
          href={`/api/quotes/${id}/pdf?version=${shown.number}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium hover:bg-slate-50"
        >
          PDF v{shown.number}
        </a>
        {editing && dirty && <span className="text-xs text-slate-500">Guarda el borrador para verlo en el PDF.</span>}
        {quote.versions.length > 1 && <span className="ml-2 text-slate-500">Versiones:</span>}
        {quote.versions.length > 1 &&
          quote.versions.map((v) => (
            <button
              key={v.number}
              onClick={() => setViewNumber(v.number)}
              className={`rounded-full border px-3 py-1 ${v.number === shown.number ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white'}`}
            >
              v{v.number}
              {v.number === current.number ? ' (vigente)' : ' (sustituida)'}
            </button>
          ))}
      </div>

      {editing ? (
        <Editor
          quote={quote}
          version={current}
          draft={draft!}
          onChange={(d) => {
            setDraft(d);
            setDirty(true);
          }}
        />
      ) : (
        <VersionView quote={quote} version={shown} />
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Activities
            basePath={`/quotes/${id}`}
            activities={quote.activities}
            hasNextAction={!!quote.nextAction}
            active={['ENVIADA', 'EN_NEGOCIACION'].includes(quote.status)}
            editable={editable}
            onChanged={load}
            onError={setError}
          />
        </div>
        <Card title="Historial">
          <ul className="space-y-2 text-sm">
            {quote.statusHistory.map((h) => (
              <li key={h.id}>
                <span className="font-medium">
                  {h.fromStatus ? `${QUOTE_STATUS_LABELS[h.fromStatus]} → ` : ''}
                  {QUOTE_STATUS_LABELS[h.toStatus]}
                </span>{' '}
                <span className="text-slate-500">v{h.versionNumber}</span>
                <div className="text-xs text-slate-500">
                  {h.user?.name ?? 'Sistema'} · {formatDateTime(h.createdAt)}
                </div>
                {h.comment && <div className="text-slate-600">{h.comment}</div>}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {modal === 'send' && <SendModal busy={busy} onClose={() => setModal(null)} onConfirm={(body) => run('/send', body)} />}
      {modal === 'accept' && (
        <AcceptModal
          busy={busy}
          opportunityOpen={!quote.opportunity.closedAt}
          onClose={() => setModal(null)}
          onConfirm={(body) => run('/outcome', { status: 'ACEPTADA', ...body })}
        />
      )}
      {modal === 'reject' && (
        <CommentModal
          title="Cotización rechazada"
          label="Motivo del rechazo *"
          action="Marcar rechazada"
          required
          busy={busy}
          onClose={() => setModal(null)}
          onConfirm={(comment) => run('/outcome', { status: 'RECHAZADA', comment })}
        />
      )}
      {modal === 'approve' && (
        <CommentModal
          title="Autorizar margen"
          label="Comentario (opcional)"
          action="Autorizar"
          busy={busy}
          onClose={() => setModal(null)}
          onConfirm={(comment) => run('/approve', { comment })}
        />
      )}
      {modal === 'return' && (
        <CommentModal
          title="Regresar al ejecutivo"
          label="¿Qué hay que corregir? *"
          action="Regresar"
          required
          busy={busy}
          onClose={() => setModal(null)}
          onConfirm={(comment) => run('/reject-approval', { comment })}
        />
      )}
    </div>
  );
}

function StatusBanner({ quote, current }: { quote: QuoteDetail; current: QuoteVersion }) {
  const margin = Number(current.marginPct);
  const min = Number(current.minMarginPct);
  const messages: Partial<Record<QuoteDetail['status'], string>> = {
    PENDIENTE_APROBACION: `El margen de ${margin}% está por debajo del mínimo de ${min}%. Un gerente comercial debe autorizarla antes de enviarla.`,
    AUTORIZADA: current.approvedBy
      ? `Autorizada por ${current.approvedBy.name}${current.approvalComment ? `: “${current.approvalComment}”` : ''}. Lista para enviar.`
      : 'Lista para enviar al cliente.',
    VENCIDA: 'Pasó la vigencia. Crea una versión nueva para actualizar precios y vigencia.',
    RECHAZADA: `Rechazada${quote.rejectedReason ? `: ${quote.rejectedReason}` : ''}.`,
    ACEPTADA: `Aceptada el ${formatDate(quote.closedAt)}.`,
  };
  const msg = messages[quote.status];
  if (!msg) return null;
  const tone =
    quote.status === 'PENDIENTE_APROBACION' || quote.status === 'VENCIDA'
      ? 'bg-amber-50 text-amber-800'
      : quote.status === 'ACEPTADA'
        ? 'bg-emerald-50 text-emerald-800'
        : 'bg-slate-100 text-slate-700';
  return <p className={`rounded-md px-3 py-2 text-sm ${tone}`}>{msg}</p>;
}

function Totals({
  currency,
  subtotal,
  tax,
  total,
  totalCost,
  margin,
  min,
  taxRate,
}: {
  currency: string;
  subtotal: number;
  tax: number;
  total: number;
  totalCost: number;
  margin: number;
  min: number;
  taxRate: number;
}) {
  return (
    <dl className="ml-auto w-full max-w-xs space-y-1 text-sm">
      <div className="flex justify-between">
        <dt className="text-slate-500">Subtotal</dt>
        <dd>{formatMoney(subtotal, currency)}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-slate-500">IVA {taxRate}%</dt>
        <dd>{formatMoney(tax, currency)}</dd>
      </div>
      <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold">
        <dt>Total</dt>
        <dd>{formatMoney(total, currency)}</dd>
      </div>
      <div className="flex justify-between pt-2 text-slate-500">
        <dt>Costo</dt>
        <dd>{formatMoney(totalCost, currency)}</dd>
      </div>
      <div className="flex items-center justify-between">
        <dt className="text-slate-500">Mínimo {min}%</dt>
        <dd>
          <MarginBadge margin={margin} min={min} />
        </dd>
      </div>
    </dl>
  );
}

function VersionView({ quote, version }: { quote: QuoteDetail; version: QuoteVersion }) {
  return (
    <Card title={`Versión ${version.number}`}>
      <div className="mb-3 grid gap-2 text-sm sm:grid-cols-4">
        <Info label="Contacto">{quote.contact?.name ?? '—'}</Info>
        <Info label="Vigencia">{formatDay(version.validUntil)}</Info>
        <Info label="Moneda / TC">
          {version.currency} · {Number(version.exchangeRate).toFixed(2)}
        </Info>
        <Info label="Emitida">{version.issuedAt ? formatDateTime(version.issuedAt) : 'No enviada'}</Info>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
            <tr>
              <th className="py-2 pr-2">Descripción</th>
              <th className="px-2 py-2 text-right">Cant.</th>
              <th className="px-2 py-2 text-right">Costo unit.</th>
              <th className="px-2 py-2 text-right">Precio unit.</th>
              <th className="px-2 py-2 text-right">Desc.</th>
              <th className="py-2 pl-2 text-right">Importe</th>
            </tr>
          </thead>
          <tbody>
            {version.items.map((i) => (
              <tr key={i.id} className="border-b border-slate-100">
                <td className="py-2 pr-2">
                  {i.sku && <span className="mr-1 font-mono text-xs text-slate-500">{i.sku}</span>}
                  <span className="whitespace-pre-line">{i.description}</span>
                </td>
                <td className="px-2 py-2 text-right">{Number(i.quantity)}</td>
                <td className="px-2 py-2 text-right text-slate-500">{formatMoney(i.unitCost, version.currency)}</td>
                <td className="px-2 py-2 text-right">{formatMoney(i.unitPrice, version.currency)}</td>
                <td className="px-2 py-2 text-right">{Number(i.discountPct) ? `${Number(i.discountPct)}%` : '—'}</td>
                <td className="py-2 pl-2 text-right">{formatMoney(i.lineTotal, version.currency)}</td>
              </tr>
            ))}
            {!version.items.length && (
              <tr>
                <td colSpan={6} className="py-4 text-center text-slate-500">
                  Sin partidas
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-col gap-4 sm:flex-row">
        <div className="flex-1 space-y-2 text-sm">
          {version.terms && (
            <div>
              <div className="text-slate-500">Términos</div>
              <div className="whitespace-pre-line">{version.terms}</div>
            </div>
          )}
          {version.notes && (
            <div>
              <div className="text-slate-500">Notas</div>
              <div className="whitespace-pre-line">{version.notes}</div>
            </div>
          )}
        </div>
        <Totals
          currency={version.currency}
          subtotal={Number(version.subtotal)}
          tax={Number(version.tax)}
          total={Number(version.total)}
          totalCost={Number(version.totalCost)}
          margin={Number(version.marginPct)}
          min={Number(version.minMarginPct)}
          taxRate={Number(version.taxRate)}
        />
      </div>
    </Card>
  );
}

function Editor({
  quote,
  version,
  draft,
  onChange,
}: {
  quote: QuoteDetail;
  version: QuoteVersion;
  draft: Draft;
  onChange: (d: Draft) => void;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api<Product[]>('/products').then(setProducts).catch(() => setProducts([]));
  }, []);

  const matches = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (term.length < 2) return [];
    return products
      .filter((p) => `${p.name} ${p.sku ?? ''} ${p.brand ?? ''}`.toLowerCase().includes(term))
      .slice(0, 8);
  }, [products, search]);

  const taxRate = Number(version.taxRate);
  const totals = computeQuoteTotals(draft.lines.map(numericLine), taxRate);
  const rate = Number(draft.exchangeRate) || 1;

  const setLine = (key: string, patch: Partial<Line>) =>
    onChange({ ...draft, lines: draft.lines.map((l) => (l.key === key ? patchLine(l, patch) : l)) });

  // Convierte el precio del catálogo a la moneda de la cotización con el TC de esta versión.
  function convert(amount: string, from: 'MXN' | 'USD') {
    const n = Number(amount);
    if (from === draft.currency) return n;
    return Math.round((from === 'USD' ? n * rate : n / rate) * 100) / 100;
  }

  // El margen inicial sale del precio de lista del catálogo.
  function addProduct(p: Product) {
    const unitCost = convert(p.unitCost, p.currency);
    const unitPrice = convert(p.listPrice, p.currency);
    onChange({
      ...draft,
      lines: [
        ...draft.lines,
        {
          key: newKey(),
          productId: p.id,
          sku: p.sku,
          description: p.name,
          quantity: '1',
          unitCost: String(unitCost),
          marginPct: String(marginFromPrice(unitCost, unitPrice)),
          unitPrice: String(unitPrice),
          discountPct: '0',
        },
      ],
    });
    setSearch('');
  }

  function addFree() {
    onChange({
      ...draft,
      lines: [
        ...draft.lines,
        {
          key: newKey(),
          productId: null,
          sku: null,
          description: '',
          quantity: '1',
          unitCost: '0',
          marginPct: String(Number(version.minMarginPct)),
          unitPrice: '0',
          discountPct: '0',
        },
      ],
    });
  }

  const cell = 'px-1 py-1';

  return (
    <Card title={`Versión ${version.number} · borrador`}>
      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <Field label="Contacto">
          <Select value={draft.contactId} onChange={(e) => onChange({ ...draft, contactId: e.target.value })}>
            <option value="">Sin contacto</option>
            {quote.opportunity.account.contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Moneda">
          <Select value={draft.currency} onChange={(e) => onChange({ ...draft, currency: e.target.value as Draft['currency'] })}>
            <option>MXN</option>
            <option>USD</option>
          </Select>
        </Field>
        <Field label="TC (MXN por USD)" hint="Se fija en esta versión">
          <Input type="number" min={0} step="0.01" value={draft.exchangeRate} onChange={(e) => onChange({ ...draft, exchangeRate: e.target.value })} />
        </Field>
        <Field label="Vigente hasta">
          <Input type="date" value={draft.validUntil} onChange={(e) => onChange({ ...draft, validUntil: e.target.value })} />
        </Field>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-1 py-2">Descripción</th>
              <th className="w-20 px-1 py-2">Cant.</th>
              <th className="w-28 px-1 py-2">Costo unit.</th>
              <th className="w-24 px-1 py-2" title="Sobre el precio de venta: precio = costo / (1 − margen)">
                Margen %
              </th>
              <th className="w-28 px-1 py-2 text-right">Precio unit.</th>
              <th className="w-20 px-1 py-2">Desc. %</th>
              <th className="w-28 px-1 py-2 text-right">Importe</th>
              <th className="w-24 px-1 py-2 text-right" title="Margen después del descuento">
                Margen real
              </th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {draft.lines.map((l) => {
              const { lineTotal, lineCost } = computeLine(numericLine(l));
              const lineMargin = lineTotal > 0 ? ((lineTotal - lineCost) / lineTotal) * 100 : 0;
              return (
                <tr key={l.key} className="border-b border-slate-100 align-top">
                  <td className={cell}>
                    {l.sku && <div className="mb-1 font-mono text-xs text-slate-500">{l.sku}</div>}
                    <Textarea rows={1} value={l.description} onChange={(e) => setLine(l.key, { description: e.target.value })} aria-label="Descripción" />
                  </td>
                  <td className={cell}>
                    <Input type="number" min={0} value={l.quantity} onChange={(e) => setLine(l.key, { quantity: e.target.value })} aria-label="Cantidad" />
                  </td>
                  <td className={cell}>
                    <Input type="number" min={0} step="0.01" value={l.unitCost} onChange={(e) => setLine(l.key, { unitCost: e.target.value })} aria-label="Costo unitario" />
                  </td>
                  <td className={cell}>
                    {hasCost(l) ? (
                      <Input
                        type="number"
                        max={MAX_LINE_MARGIN_PCT}
                        step="0.01"
                        value={l.marginPct}
                        onChange={(e) => setLine(l.key, { marginPct: e.target.value })}
                        aria-label="Margen"
                        aria-invalid={invalidMargin(l)}
                        className={
                          invalidMargin(l)
                            ? '!border-red-400 text-red-700'
                            : Number(l.marginPct) < Number(version.minMarginPct)
                              ? '!border-amber-400 text-amber-800'
                              : undefined
                        }
                      />
                    ) : (
                      <div className="pt-2 text-center text-slate-400" title="Sin costo: captura el precio">
                        —
                      </div>
                    )}
                    {invalidMargin(l) && <div className="mt-1 text-xs text-red-600">Menor a 100%</div>}
                  </td>
                  <td className={cell}>
                    {hasCost(l) ? (
                      <div className="pt-2 text-right tabular-nums">{formatMoney(Number(l.unitPrice) || 0, draft.currency)}</div>
                    ) : (
                      <Input type="number" min={0} step="0.01" value={l.unitPrice} onChange={(e) => setLine(l.key, { unitPrice: e.target.value })} aria-label="Precio unitario" />
                    )}
                  </td>
                  <td className={cell}>
                    <Input type="number" min={0} max={100} value={l.discountPct} onChange={(e) => setLine(l.key, { discountPct: e.target.value })} aria-label="Descuento" />
                  </td>
                  <td className={`${cell} pt-3 text-right`}>{formatMoney(lineTotal, draft.currency)}</td>
                  <td className={`${cell} pt-3 text-right ${lineMargin < Number(version.minMarginPct) ? 'text-amber-700' : 'text-slate-500'}`}>
                    {lineMargin.toFixed(1)}%
                  </td>
                  <td className={`${cell} pt-2`}>
                    <button
                      onClick={() => onChange({ ...draft, lines: draft.lines.filter((x) => x.key !== l.key) })}
                      className="rounded px-2 py-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      aria-label="Quitar partida"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-start gap-2">
        <div className="relative min-w-60 flex-1">
          <Input placeholder="Agregar del catálogo: nombre, SKU o marca" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Buscar en catálogo" />
          {matches.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full divide-y divide-slate-100 rounded-md border border-slate-200 bg-white shadow">
              {matches.map((p) => (
                <li key={p.id}>
                  <button onClick={() => addProduct(p)} className="flex w-full justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50">
                    <span>
                      {p.sku && <span className="mr-1 font-mono text-xs text-slate-500">{p.sku}</span>}
                      {p.name}
                    </span>
                    <span className="whitespace-nowrap text-slate-500">{formatMoney(p.listPrice, p.currency)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {search.trim().length >= 2 && !matches.length && <p className="mt-1 text-xs text-slate-500">Sin coincidencias en el catálogo.</p>}
        </div>
        <Button variant="secondary" onClick={addFree}>
          Partida libre
        </Button>
      </div>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row">
        <div className="flex-1 space-y-3">
          <Field label="Términos y condiciones">
            <Textarea rows={4} value={draft.terms} onChange={(e) => onChange({ ...draft, terms: e.target.value })} />
          </Field>
          <Field label="Notas para el cliente">
            <Textarea rows={2} value={draft.notes} onChange={(e) => onChange({ ...draft, notes: e.target.value })} />
          </Field>
        </div>
        <Totals
          currency={draft.currency}
          {...totals}
          margin={totals.marginPct}
          min={Number(version.minMarginPct)}
          taxRate={taxRate}
        />
      </div>
    </Card>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-slate-500">{label}</div>
      <div>{children}</div>
    </div>
  );
}

function SendModal({
  busy,
  onClose,
  onConfirm,
}: {
  busy: boolean;
  onClose: () => void;
  onConfirm: (body: unknown) => void;
}) {
  const [channel, setChannel] = useState('CORREO');
  const [comment, setComment] = useState('');
  const [subject, setSubject] = useState('Confirmar recepción y resolver dudas');
  const [dueAt, setDueAt] = useState(() => toLocalInput(new Date(Date.now() + 2 * 86_400_000)));
  return (
    <Modal title="Registrar envío al cliente" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Canal">
          <Select value={channel} onChange={(e) => setChannel(e.target.value)}>
            <option value="CORREO">Correo</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="REUNION">Reunión</option>
            <option value="OTRO">Otro</option>
          </Select>
        </Field>
        <Field label="Comentario">
          <Textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} />
        </Field>
        <Field label="Seguimiento *" hint="Toda cotización enviada necesita una próxima acción (RN-05)">
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
        </Field>
        <Field label="Fecha del seguimiento *">
          <Input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={busy || !subject.trim() || !dueAt}
            onClick={() =>
              onConfirm({ channel, comment: comment || null, followUp: { subject, dueAt: new Date(dueAt).toISOString() } })
            }
          >
            Registrar envío
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function AcceptModal({
  busy,
  opportunityOpen,
  onClose,
  onConfirm,
}: {
  busy: boolean;
  opportunityOpen: boolean;
  onClose: () => void;
  onConfirm: (body: { comment: string | null; winOpportunity: boolean }) => void;
}) {
  const [comment, setComment] = useState('');
  const [win, setWin] = useState(opportunityOpen);
  return (
    <Modal title="Cotización aceptada" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Evidencia o comentario" hint="Ej. orden de compra 4512 recibida por correo">
          <Textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} />
        </Field>
        {opportunityOpen && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={win} onChange={(e) => setWin(e.target.checked)} />
            Marcar la oportunidad como ganada con el monto de esta versión
          </label>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={busy} onClick={() => onConfirm({ comment: comment || null, winOpportunity: win })}>
            Confirmar aceptación
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function CommentModal({
  title,
  label,
  action,
  required,
  busy,
  onClose,
  onConfirm,
}: {
  title: string;
  label: string;
  action: string;
  required?: boolean;
  busy: boolean;
  onClose: () => void;
  onConfirm: (comment: string | null) => void;
}) {
  const [comment, setComment] = useState('');
  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-3">
        <Field label={label}>
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} autoFocus />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={busy || (required && !comment.trim())} onClick={() => onConfirm(comment.trim() || null)}>
            {action}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
