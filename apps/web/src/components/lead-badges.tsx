import { LEAD_STATUS_LABELS, type LeadStatus } from '@teczone/shared';
import { formatDateTime } from '@/lib/format';
import { STATUS_STYLES, type LeadListItem } from '@/lib/leads';
import { Badge } from './ui';

export function StatusBadge({ status }: { status: LeadStatus }) {
  return <Badge className={STATUS_STYLES[status]}>{LEAD_STATUS_LABELS[status]}</Badge>;
}

// Estado del SLA de primer contacto (RN-14).
export function SlaBadge({ lead }: { lead: Pick<LeadListItem, 'firstContactAt' | 'firstContactDueAt' | 'firstContactOverdue' | 'status'> }) {
  if (lead.firstContactAt || lead.status !== 'NUEVO' || !lead.firstContactDueAt) return null;
  if (lead.firstContactOverdue) {
    return <Badge className="bg-red-100 text-red-800">Contacto vencido</Badge>;
  }
  return (
    <Badge className="bg-slate-100 text-slate-700" >
      Contactar antes de {formatDateTime(lead.firstContactDueAt)}
    </Badge>
  );
}
