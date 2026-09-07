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
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { AnalyticsExtendedCharts } from '@/features/admin/AnalyticsExtendedCharts'
import { DashboardCharts } from '@/features/admin/DashboardCharts'
import { StatCard } from '@/features/admin/StatCard'
import { fetchAnalytics } from '@/features/admin/analyticsApi'
import { fetchAdminDepartments } from '@/features/admin/catalogApi'
import { useAuth } from '@/features/auth/AuthProvider'
import { ApiError } from '@/services/api'
import { formatCount } from '@/utils/format'
import type { CatalogItem } from '@shared/catalog'

export function AdminDashboardPage() {
  const { profile } = useAuth()
  const staffDepartmentId = profile?.role === 'staff' ? profile.departmentId : null
  const [period, setPeriod] = useState<AnalyticsPeriod>('monthly')
  const [range, setRange] = useState<AnalyticsRange>('all')
  const [data, setData] = useState<AnalyticsResponse | null>(null)
  const [departments, setDepartments] = useState<CatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([fetchAnalytics(period, range), fetchAdminDepartments()])
      .then(([response, catalog]) => {
        if (!cancelled) {
          setData(response)
          setDepartments(catalog.departments)
        }
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
  const departmentRows = (() => {
    const pendingById = new Map(
      (data?.pending_by_department ?? []).filter((item) => item.id).map((item) => [item.id as string, item.count]),
    )
    const reportsById = new Map(
      (data?.departments ?? []).filter((item) => item.id).map((item) => [item.id as string, item.count]),
    )
    const rows = departments
      .filter((item) => !staffDepartmentId || item.id === staffDepartmentId)
      .map((item) => ({
        id: item.id,
        name: item.name,
        pending: pendingById.get(item.id) ?? 0,
        reports: reportsById.get(item.id) ?? 0,
      }))
    for (const item of data?.departments ?? []) {
      if (!item.id || (staffDepartmentId && item.id !== staffDepartmentId)) continue
      if (rows.some((row) => row.id === item.id)) continue
      rows.push({
        id: item.id,
        name: item.name,
        pending: pendingById.get(item.id) ?? 0,
        reports: item.count,
      })
    }
    if (!staffDepartmentId) {
      const unassignedPending = data?.pending_by_department?.find((item) => !item.id)?.count ?? 0
      const unassignedReports = data?.departments?.find((item) => !item.id)?.count ?? 0
      if (unassignedPending > 0 || unassignedReports > 0) {
        rows.unshift({
          id: '',
          name: 'Unassigned',
          pending: unassignedPending,
          reports: unassignedReports,
        })
      }
    }
    return rows.sort((left, right) => right.pending - left.pending || right.reports - left.reports || left.name.localeCompare(right.name))
  })()

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Dashboard</h1>
          <p className="mt-1 text-sm text-ink-500">
            <span className="hidden md:inline">
              Overview of civic reports for Kidapawan City. Cards and charts use the same tickets in the
              selected date range. Personal information is never shown.{' '}
            </span>
            <Link className="font-semibold text-pine-800 hover:underline" to="/admin/analytics">
              Open full analytics
            </Link>
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:w-auto sm:gap-3">
          <div className="min-w-0 sm:w-44">
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
          <div className="min-w-0 sm:w-40">
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

      <div className="grid grid-cols-4 gap-2 sm:gap-4">
        <StatCard compact label="In progress" value={totals?.in_progress} loading={loading} />
        <StatCard compact label="Resolved" value={totals?.resolved} loading={loading} />
        <StatCard compact label="Closed" value={totals?.closed} loading={loading} />
        <StatCard compact label="Rejected" value={totals?.rejected} loading={loading} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total reports" value={totals?.total} hint="Tickets created in this date range" loading={loading} />
        <StatCard
          label="Pending"
          value={totals?.pending}
          hint="Submitted, received, under review, and in progress"
          loading={loading}
        />
        <StatCard
          label="Reporting users"
          value={data?.users.total}
          hint="Unique residents in this date range"
          loading={loading}
        />
        <StatCard
          label="Unassigned"
          value={totals?.unassigned}
          hint="Tickets in this range with no department"
          loading={loading}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending by department</CardTitle>
        </CardHeader>
        <CardBody>
          {loading ? (
            <p className="text-sm text-ink-500">Loading department queues…</p>
          ) : departmentRows.length === 0 ? (
            <p className="text-sm text-ink-500">No departments yet.</p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Department</TH>
                  <TH>Pending</TH>
                  <TH>Reports</TH>
                </TR>
              </THead>
              <TBody>
                {departmentRows.map((item) => (
                  <TR key={item.id || 'unassigned'}>
                    <TD className="font-medium">
                      {item.id ? (
                        <Link className="text-pine-800 hover:underline" to={`/admin/reports?department_id=${item.id}`}>
                          {item.name}
                        </Link>
                      ) : (
                        item.name
                      )}
                    </TD>
                    <TD className={item.pending > 0 ? 'font-semibold text-earth-700' : 'text-ink-500'}>
                      {formatCount(item.pending)}
                    </TD>
                    <TD>{formatCount(item.reports)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
          <p className="mt-3 text-xs text-ink-500">
            Pending and reports both use tickets created in the selected date range. Pending is the open
            queue: submitted, received, under review, and in progress. Those pending counts match the
            department chart.
          </p>
        </CardBody>
      </Card>

      <DashboardCharts data={data} loading={loading} />
      <AnalyticsExtendedCharts data={data} loading={loading} />
    </div>
  )
}
