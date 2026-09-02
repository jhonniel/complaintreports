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
import { AnalyticsExtendedCharts } from '@/features/admin/AnalyticsExtendedCharts'
import { DashboardCharts } from '@/features/admin/DashboardCharts'
import { StatCard } from '@/features/admin/StatCard'
import { fetchAnalytics } from '@/features/admin/analyticsApi'
import { ApiError } from '@/services/api'

export function AdminAnalyticsPage() {
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
        setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
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
  const users = data?.users
  const geography = data?.geography

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Analytics</h1>
          <p className="mt-1 text-sm text-ink-500">
            Charts never include names, contact details, exact birth dates, or exact personal
            location. Age is grouped. Geographic totals use rounded areas only.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="sm:w-44">
            <Label htmlFor="analytics-range">Date range</Label>
            <Select
              id="analytics-range"
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
            <Label htmlFor="analytics-period">Group by</Label>
            <Select
              id="analytics-period"
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Reports in range" value={totals?.total} loading={loading} />
        <StatCard label="Users in range" value={users?.total} hint="Unique reporters in this filter" loading={loading} />
        <StatCard label="New users" value={users?.new} loading={loading} />
        <StatCard label="Returning users" value={users?.returning} loading={loading} />
        <StatCard label="Assigned" value={totals?.assigned} hint="Tickets with a department" loading={loading} />
        <StatCard label="Unassigned" value={totals?.unassigned} loading={loading} />
        <StatCard label="With location" value={geography?.with_location} loading={loading} />
        <StatCard label="Not captured" value={geography?.without_location} hint="Reports without coordinates" loading={loading} />
      </div>

      <DashboardCharts data={data} loading={loading} />
      <AnalyticsExtendedCharts data={data} loading={loading} />
      <p className="text-sm text-ink-500">
        Interactive map markers remain on the{' '}
        <Link className="font-semibold text-pine-800 hover:underline" to="/admin/map">
          map page
        </Link>
        .
      </p>
    </div>
  )
}
