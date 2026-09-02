import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ANALYTICS_PERIODS,
  ANALYTICS_RANGES,
  PERIOD_LABELS,
  RANGE_LABELS,
  type AnalyticsPeriod,
  type AnalyticsRange,
  type AnalyticsResponse,
} from '@shared/analytics'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { DashboardCharts } from '@/features/admin/DashboardCharts'
import { StatCard } from '@/features/admin/StatCard'
import { fetchAnalytics } from '@/features/admin/analyticsApi'
import { ApiError } from '@/services/api'

export function AdminDashboardPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>('monthly')
  const [range, setRange] = useState<AnalyticsRange>('all')
  const [data, setData] = useState<AnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchAnalytics(period, range)
      .then((response) => {
        if (!cancelled) setData(response)
      })
      .catch((err) => {
        if (cancelled) return
        if (err instanceof ApiError) {
          setError(err.status === 401 ? 'Sign in to view the dashboard.' : err.message)
        } else {
          setError('Something went wrong. Please try again.')
        }
        setData(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [period, range])

  const totals = data?.totals

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Dashboard</h1>
          <p className="mt-1 text-sm text-ink-500">
            Overview of civic reports for Kidapawan City, including gender, age groups, and rounded
          locations. Personal information is never shown in these charts.{' '}
            <Link className="font-semibold text-pine-800 hover:underline" to="/admin/analytics">
              Open full analytics
            </Link>
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="sm:w-44">
            <Label htmlFor="range">Date range</Label>
            <Select
              id="range"
              className="mt-1.5"
              value={range}
              onChange={(event) => setRange(event.target.value as AnalyticsRange)}
            >
              {ANALYTICS_RANGES.map((value) => (
                <option key={value} value={value}>
                  {RANGE_LABELS[value]}
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:w-40">
            <Label htmlFor="period">Group by</Label>
            <Select
              id="period"
              className="mt-1.5"
              value={period}
              onChange={(event) => setPeriod(event.target.value as AnalyticsPeriod)}
            >
              {ANALYTICS_PERIODS.map((value) => (
                <option key={value} value={value}>
                  {PERIOD_LABELS[value]}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {error ? (
        <p className="rounded-md border border-danger-500/30 bg-danger-50 px-3 py-2 text-sm text-danger-700" role="alert">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Total Reports" value={totals?.total} loading={loading} />
        <StatCard
          label="Pending Reports"
          value={totals?.pending}
          hint="Submitted, received, and under review"
          loading={loading}
        />
        <StatCard label="In Progress" value={totals?.in_progress} loading={loading} />
        <StatCard label="Resolved" value={totals?.resolved} loading={loading} />
        <StatCard label="Closed" value={totals?.closed} loading={loading} />
        <StatCard
          label="Total Reporting Users"
          value={totals?.reporting_users}
          hint="Unique residents, all time"
          loading={loading}
        />
      </div>

      <DashboardCharts data={data} loading={loading} />
    </div>
  )
}
