import { PRIORITY_LABELS, STATUS_LABELS, type ReportPriority, type ReportStatus } from '@shared/report'
import { Badge } from '@/components/ui/Badge'

const statusVariant: Record<ReportStatus, 'default' | 'pine' | 'earth' | 'success' | 'danger' | 'info'> = {
  submitted: 'default',
  received: 'info',
  under_review: 'earth',
  in_progress: 'pine',
  resolved: 'success',
  closed: 'default',
  rejected: 'danger',
}

const priorityVariant: Record<ReportPriority, 'default' | 'info' | 'warning' | 'danger'> = {
  low: 'default',
  medium: 'info',
  high: 'warning',
  urgent: 'danger',
}

export function StatusBadge({ status }: { status: ReportStatus }) {
  return <Badge variant={statusVariant[status]}>{STATUS_LABELS[status]}</Badge>
}

export function PriorityBadge({ priority }: { priority: ReportPriority }) {
  return <Badge variant={priorityVariant[priority]}>{PRIORITY_LABELS[priority]}</Badge>
}
