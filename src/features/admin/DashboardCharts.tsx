import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
import { useMediaQuery } from '@/hooks/useMediaQuery'
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

const GENDER_COLORS: Record<string, string> = {
  Female: SPRING,
  Male: PINE,
  'Non-binary': EARTH,
  'Prefer not to say': INK,
  Unknown: PINE_LIGHT,
}

interface DashboardChartsProps {
  data: AnalyticsResponse | null
  loading: boolean
}

export function DashboardCharts({ data, loading }: DashboardChartsProps) {
  const isDesktop = useMediaQuery('(min-width: 640px)')
  const categoryAxisWidth = isDesktop ? 120 : 72
  if (loading) {
    return (
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <ChartSkeleton title="Reports over time" />
        <ChartSkeleton title="Reports by category" />
        <ChartSkeleton title="Status distribution" />
        <ChartSkeleton title="Reporting users" />
        <ChartSkeleton title="Reports by gender" />
        <ChartSkeleton title="Reports by age" />
        <ChartSkeleton title="Reports with a map pin" />
        <ChartSkeleton title="Approximate report areas" />
      </div>
    )
  }

  const empty = !data || data.totals.total === 0
  const genderSlice = (data?.demographics?.genders ?? []).filter((item) => item.count > 0)
  const ageSlice = (data?.demographics?.ages ?? []).filter((item) => item.count > 0)
  const locationSlice = data
    ? [
        { name: 'With map pin', count: data.geography.with_location, color: SPRING },
        { name: 'No map pin', count: data.geography.without_location, color: INK },
      ].filter((item) => item.count > 0)
    : []

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-2">
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
            <div className="mt-4 h-56 min-w-0 sm:h-64">
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
            <div className="mt-4 h-56 min-w-0 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.categories} layout="vertical" margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d6cfb8" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={categoryAxisWidth} tick={{ fontSize: 10 }} />
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
            <DonutChart
              data={data.statuses.filter((item) => item.count > 0)}
              getColor={(item) => STATUS_COLORS[item.status ?? ''] ?? INK}
            />
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <p className="text-sm font-semibold text-ink-800">Reporting users</p>
          <p className="mt-1 text-xs text-ink-400">
            Unique residents are counted with a private phone fingerprint. Names and numbers are never shown.
          </p>
          {!data || data.users.total === 0 ? (
            <EmptyState
              className="py-10"
              title="No reporting users yet"
              description="Unique and returning reporters will appear after the first tickets."
            />
          ) : (
            <div className="mt-4 h-56 min-w-0 sm:h-64">
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

      <Card>
        <CardBody>
          <p className="text-sm font-semibold text-ink-800">Reports by gender</p>
          <p className="mt-1 text-xs text-ink-400">Counts only. Names and other personal details are not shown.</p>
          {empty || genderSlice.length === 0 ? (
            <EmptyState
              className="py-10"
              title="No gender data"
              description="Gender totals will appear after residents submit reports."
            />
          ) : (
            <DonutChart
              data={genderSlice}
              getColor={(item) => GENDER_COLORS[item.name] ?? INK}
            />
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <p className="text-sm font-semibold text-ink-800">Reports by age</p>
          <p className="mt-1 text-xs text-ink-400">Age is grouped from the birth date on the ticket. Exact birth dates are not shown.</p>
          {empty || ageSlice.length === 0 ? (
            <EmptyState
              className="py-10"
              title="No age data"
              description="Age groups will appear after residents submit reports."
            />
          ) : (
            <div className="mt-4 h-56 min-w-0 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.demographics?.ages ?? []} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d6cfb8" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={48} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Reports" fill={INFO} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <p className="text-sm font-semibold text-ink-800">Reports with a map pin</p>
          <p className="mt-1 text-xs text-ink-400">Whether a ticket could be placed on the map. Exact points stay on the map page.</p>
          {empty || locationSlice.length === 0 ? (
            <EmptyState
              className="py-10"
              title="No map pin stats"
              description="Location capture rates will appear after tickets are submitted."
            />
          ) : (
            <DonutChart data={locationSlice} getColor={(item) => item.color ?? INK} />
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <p className="text-sm font-semibold text-ink-800">Approximate report areas</p>
          <p className="mt-1 text-xs text-ink-400">
            Coordinates are rounded so individual households are not shown.
          </p>
          {empty || !data?.geography.areas.length ? (
            <EmptyState
              className="py-10"
              title="No geographic clusters yet"
              description="Approximate areas appear after a report can be mapped from its address."
            />
          ) : (
            <div className="mt-4 h-56 min-w-0 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.geography.areas} layout="vertical" margin={{ top: 8, right: 16, left: 24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d6cfb8" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="label" width={150} tick={{ fontSize: 11 }} />
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

function DonutChart({
  data,
  getColor,
}: {
  data: Array<{ name: string; count: number; status?: string; color?: string }>
  getColor: (item: { name: string; count: number; status?: string; color?: string }) => string
}) {
  return (
    <div className="mt-4">
      <div className="h-52 min-w-0 overflow-visible sm:h-60">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Pie
              data={data}
              dataKey="count"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="48%"
              outerRadius="78%"
              paddingAngle={2}
            >
              {data.map((item) => (
                <Cell key={item.name} fill={getColor(item)} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-xs text-ink-600">
        {data.map((item) => (
          <li key={item.name} className="flex items-center gap-1.5">
            <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: getColor(item) }} />
            {item.name}
          </li>
        ))}
      </ul>
    </div>
  )
}

function ChartSkeleton({ title }: { title: string }) {
  return (
    <Card>
      <CardBody>
        <p className="text-sm font-semibold text-ink-800">{title}</p>
        <Skeleton className="mt-4 h-56 min-w-0 sm:h-64" />
      </CardBody>
    </Card>
  )
}
