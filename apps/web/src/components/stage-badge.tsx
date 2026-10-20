import { STAGE_LABELS, type OpportunityStage } from '@teczone/shared';
import { STAGE_STYLES } from '@/lib/crm';
import { Badge } from './ui';

export function StageBadge({ stage }: { stage: OpportunityStage }) {
  return <Badge className={STAGE_STYLES[stage] ?? 'bg-sky-100 text-sky-800'}>{STAGE_LABELS[stage]}</Badge>;
}
