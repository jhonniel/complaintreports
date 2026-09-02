import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { AnalyticsResponse } from '@shared/analytics'
import { Card, CardBody } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'

const PINE = '#1e583c'
const EARTH = '#c49a3c'
const INK = '#6b6558'
const SPRING = '#1f9d8a'

interface AnalyticsExtendedChartsProps {
  data: AnalyticsResponse | null
  loading: boolean
}

export function AnalyticsExtendedCharts({ data, loading }: AnalyticsExtendedChartsProps) {
  if (loading) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartSkeleton title="Reports by department" />
        <ChartSkeleton title="Location capture" />
        <ChartSkeleton title="Approximate report areas" />
      </div>
    )
  }

  const empty = !data || data.totals.total === 0
  const locationSlice = data
    ? [
        { name: 'With location', count: data.geography.with_location, color: SPRING },
        { name: 'Not captured', count: data.geography.without_location, color: INK },
      ].filter((item) => item.count > 0)
    : []

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardBody>
          <p className="text-sm font-semibold text-ink-800">Reports by department</p>
          {empty || !data?.departments.length ? (
            <EmptyState
              className="py-10"
              title="No department data"
              description="Assigned departments will appear here after staff assign tickets."
            />
          ) : (
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.departments} layout="vertical" margin={{ top: 8, right: 16, left: 16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d6cfb8" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
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
          <p className="text-sm font-semibold text-ink-800">Location capture</p>
          <p className="mt-1 text-xs text-ink-400">Counts whether a report included coordinates. Exact points stay on the map page.</p>
          {empty || locationSlice.length === 0 ? (
            <EmptyState
              className="py-10"
              title="No location stats"
              description="Location capture rates will appear after tickets are submitted."
            />
          ) : (
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={locationSlice} dataKey="count" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={2}>
                    {locationSlice.map((item) => (
                      <Cell key={item.name} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardBody>
      </Card>

      <Card className="lg:col-span-2">
        <CardBody>
          <p className="text-sm font-semibold text-ink-800">Approximate report areas</p>
          <p className="mt-1 text-xs text-ink-400">
            Coordinates are rounded to about 100 meters so individual households are not shown.
          </p>
          {empty || !data?.geography.areas.length ? (
            <EmptyState
              className="py-10"
              title="No geographic clusters yet"
              description="Approximate areas appear after residents share a report location."
            />
          ) : (
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.geography.areas} layout="vertical" margin={{ top: 8, right: 16, left: 24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d6cfb8" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="label" width={160} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Reports" fill={EARTH} radius={[0, 4, 4, 0]} />
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
