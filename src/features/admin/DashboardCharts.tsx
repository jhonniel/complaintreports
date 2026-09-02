import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { AnalyticsResponse } from '@shared/analytics'
import { Card, CardBody } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'

const PINE = '#1e583c'
const EARTH = '#c49a3c'
const SPRING = '#1f9d8a'
const INK = '#6b6558'
const INFO = '#2563eb'
const DANGER = '#dc4a3a'
const PINE_LIGHT = '#5aa67c'

const STATUS_COLORS: Record<string, string> = {
  submitted: INK,
  received: INFO,
  under_review: EARTH,
  in_progress: PINE,
  resolved: SPRING,
  closed: PINE_LIGHT,
  rejected: DANGER,
}

interface DashboardChartsProps {
  data: AnalyticsResponse | null
  loading: boolean
}

export function DashboardCharts({ data, loading }: DashboardChartsProps) {
  if (loading) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartSkeleton title="Reports over time" />
        <ChartSkeleton title="Reports by category" />
        <ChartSkeleton title="Status distribution" />
        <ChartSkeleton title="Reporting users" />
      </div>
    )
  }

  const empty = !data || data.totals.total === 0

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardBody>
          <p className="text-sm font-semibold text-ink-800">Reports over time</p>
          {empty || !data?.timeseries.length ? (
            <EmptyState
              className="py-10"
              title="No reports in this range"
              description="Submitted tickets will appear here as a trend over time."
            />
          ) : (
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.timeseries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d6cfb8" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" name="Reports" stroke={PINE} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <p className="text-sm font-semibold text-ink-800">Reports by category</p>
          {empty || !data?.categories.length ? (
            <EmptyState
              className="py-10"
              title="No category data"
              description="Category totals will appear after residents submit reports."
            />
          ) : (
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.categories} layout="vertical" margin={{ top: 8, right: 16, left: 16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d6cfb8" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
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
          <p className="text-sm font-semibold text-ink-800">Status distribution</p>
          {empty ? (
            <EmptyState
              className="py-10"
              title="No status data"
              description="Status mix will appear once tickets exist in this range."
            />
          ) : (
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.statuses.filter((item) => item.count > 0)}
                    dataKey="count"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={88}
                    paddingAngle={2}
                  >
                    {data.statuses
                      .filter((item) => item.count > 0)
                      .map((item) => (
                        <Cell key={item.status} fill={STATUS_COLORS[item.status] ?? INK} />
                      ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <p className="text-sm font-semibold text-ink-800">Reporting users</p>
          <p className="mt-1 text-xs text-ink-400">
            Unique residents are counted with a private phone fingerprint. Names and numbers are never shown.
          </p>
          {!data || (data.users.total === 0 && data.totals.reporting_users === 0) ? (
            <EmptyState
              className="py-10"
              title="No reporting users yet"
              description="Unique and returning reporters will appear after the first tickets."
            />
          ) : (
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: 'In range', count: data.users.total },
                    { name: 'New', count: data.users.new },
                    { name: 'Returning', count: data.users.returning },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#d6cfb8" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Users" fill={EARTH} radius={[4, 4, 0, 0]} />
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
