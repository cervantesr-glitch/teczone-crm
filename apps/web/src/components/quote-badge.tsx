import { QUOTE_STATUS_LABELS, type QuoteStatus } from '@teczone/shared';
import { QUOTE_STATUS_STYLES } from '@/lib/quotes';
import { Badge } from './ui';

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  return <Badge className={QUOTE_STATUS_STYLES[status]}>{QUOTE_STATUS_LABELS[status]}</Badge>;
}

// Margen en verde si alcanza el mínimo, en ámbar si requiere autorización.
export function MarginBadge({ margin, min }: { margin: number; min: number }) {
  return (
    <Badge className={margin >= min ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}>
      Margen {margin.toFixed(2)}%
    </Badge>
  );
}
