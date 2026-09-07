import { Card, CardBody } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/cn'
import { formatCount } from '@/utils/format'

interface StatCardProps {
  label: string
  value?: number
  hint?: string
  loading?: boolean
  compact?: boolean
}

export function StatCard({ label, value, hint, loading, compact = false }: StatCardProps) {
  return (
    <Card className="min-w-0">
      <CardBody className={cn(compact && 'px-2.5 py-3 sm:px-5 sm:py-4')}>
        <p className={cn('min-w-0 truncate font-medium text-ink-500', compact ? 'text-[11px] sm:text-sm' : 'text-sm')}>
          {label}
        </p>
        {loading ? (
          <Skeleton className={cn(compact ? 'mt-1 h-7 w-10 sm:mt-2 sm:h-9 sm:w-16' : 'mt-2 h-9 w-24')} />
        ) : (
          <p
            className={cn(
              'font-display font-semibold tabular-nums',
              compact ? 'mt-1 text-xl sm:mt-2 sm:text-3xl' : 'mt-2 text-3xl',
            )}
          >
            {formatCount(value ?? 0)}
          </p>
        )}
        {!compact && hint ? <p className="mt-1 text-xs text-ink-400">{hint}</p> : null}
      </CardBody>
    </Card>
  )
}
