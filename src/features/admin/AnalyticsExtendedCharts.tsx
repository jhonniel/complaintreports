import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { AnalyticsResponse } from '@shared/analytics'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { Card, CardBody } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'

const PINE = '#1e583c'

interface AnalyticsExtendedChartsProps {
  data: AnalyticsResponse | null
  loading: boolean
}

const EARTH = '#c49a3c'

export function AnalyticsExtendedCharts({ data, loading }: AnalyticsExtendedChartsProps) {
  const isDesktop = useMediaQuery('(min-width: 640px)')
  const axisWidth = isDesktop ? 130 : 80
  if (loading) {
    return (
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <ChartSkeleton title="Reports by department" />
        <ChartSkeleton title="Pending by department" />
      </div>
    )
  }

  const empty = !data || data.totals.total === 0
  const pending = data?.pending_by_department ?? []

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-2">
      <Card>
        <CardBody>
          <p className="text-sm font-semibold text-ink-800">Reports by department</p>
          <p className="mt-1 text-xs text-ink-400">Tickets created in the selected date range, including unassigned.</p>
          {empty || !data?.departments.length ? (
            <EmptyState
              className="py-10"
              title="No department data"
              description="Assigned departments will appear here after staff assign tickets."
            />
          ) : (
            <div className="mt-4 h-56 min-w-0 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.departments} layout="vertical" margin={{ top: 8, right: 16, left: 16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d6cfb8" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={axisWidth} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Reports" fill={PINE} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardBody>
      </Card>
      <Card>
        <CardBody>
          <p className="text-sm font-semibold text-ink-800">Pending by department</p>
          <p className="mt-1 text-xs text-ink-400">
            Open tickets in this date range: submitted, received, under review, and in progress.
          </p>
          {empty || pending.length === 0 ? (
            <EmptyState
              className="py-10"
              title="No pending department queue"
              description="Open tickets assigned to a department will appear here."
            />
          ) : (
            <div className="mt-4 h-56 min-w-0 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pending} layout="vertical" margin={{ top: 8, right: 16, left: 16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d6cfb8" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={axisWidth} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Pending" fill={EARTH} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}

function ChartSkeleton({ title }: { title: string }) {
  return (
    <Card>
      <CardBody>
        <p className="text-sm font-semibold text-ink-800">{title}</p>
        <Skeleton className="mt-4 h-64" />
      </CardBody>
    </Card>
  )
}
