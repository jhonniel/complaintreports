import { Card, CardBody } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCount } from '@/utils/format'

interface StatCardProps {
  label: string
  value?: number
  hint?: string
  loading?: boolean
}

export function StatCard({ label, value, hint, loading }: StatCardProps) {
  return (
    <Card>
      <CardBody>
        <p className="text-sm font-medium text-ink-500">{label}</p>
        {loading ? (
          <Skeleton className="mt-2 h-9 w-24" />
        ) : (
          <p className="mt-2 font-display text-3xl font-semibold">{formatCount(value ?? 0)}</p>
        )}
        {hint ? <p className="mt-1 text-xs text-ink-400">{hint}</p> : null}
      </CardBody>
    </Card>
  )
}
