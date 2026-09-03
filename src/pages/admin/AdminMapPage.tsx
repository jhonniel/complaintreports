import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { parseMapFilterQuery, type MapAccessCluster, type MapReportPoint } from '@shared/map'
import { PRIORITY_LABELS, REPORT_PRIORITIES, REPORT_STATUSES, STATUS_LABELS } from '@shared/report'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { catalogDisplayName, fetchAdminCategories, fetchAdminDepartments } from '@/features/admin/catalogApi'
import { fetchMapAccess, fetchMapReports } from '@/features/admin/mapApi'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { isTomTomConfigured } from '@/lib/tomtom'
import { ApiError } from '@/services/api'
import { ChevronDown, MapPinned } from 'lucide-react'
import type { MapLayer } from '@/features/admin/AdminMapCanvas'

const AdminMapCanvas = lazy(() =>
  import('@/features/admin/AdminMapCanvas').then((module) => ({ default: module.AdminMapCanvas })),
)

function setParam(params: URLSearchParams, key: string, value: string) {
  const next = new URLSearchParams(params)
  if (value) next.set(key, value)
  else next.delete(key)
  return next
}

export function AdminMapPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const layer: MapLayer = searchParams.get('layer') === 'access' ? 'access' : 'reports'
  const focusTicket = searchParams.get('ticket')
  const query = useMemo(
    () => parseMapFilterQuery(Object.fromEntries(searchParams.entries())),
    [searchParams],
  )
  const [reports, setReports] = useState<MapReportPoint[]>([])
  const [clusters, setClusters] = useState<MapAccessCluster[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [categories, setCategories] = useState<{ id: string; name: string; is_active: boolean }[]>([])
  const [departments, setDepartments] = useState<{ id: string; name: string; is_active: boolean }[]>([])
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const [filtersOpen, setFiltersOpen] = useState(true)

  useEffect(() => {
    setFiltersOpen(isDesktop)
  }, [isDesktop])

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchAdminCategories(), fetchAdminDepartments()])
      .then(([categoryResponse, departmentResponse]) => {
        if (cancelled) return
        setCategories(categoryResponse.categories)
        setDepartments(departmentResponse.departments)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const accessQuery = { date_from: query.date_from, date_to: query.date_to }
    Promise.all([fetchMapReports(query), fetchMapAccess(accessQuery)])
      .then(([reportResponse, accessResponse]) => {
        if (cancelled) return
        setReports(reportResponse.reports)
        setClusters(accessResponse.clusters)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [query])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl font-semibold">Map</h1>
        <p className="mt-1 text-sm text-ink-500">
          Report pins come from the location a resident shares, or from the address on the ticket
          if location was not allowed. Names and contact details are never shown. Access locations
          are grouped so individual visitors cannot be identified.
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Map layer">
        <LayerButton
          active={layer === 'reports'}
          onClick={() => setSearchParams(setParam(searchParams, 'layer', 'reports'))}
        >
          Report locations
        </LayerButton>
        <LayerButton
          active={layer === 'access'}
          onClick={() => setSearchParams(setParam(searchParams, 'layer', 'access'))}
        >
          System access
        </LayerButton>
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-ink-800">Filters</p>
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
          >
            {filtersOpen ? 'Hide' : 'Show'}
            <ChevronDown className={`size-4 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
          </Button>
        </div>
        {filtersOpen ? (
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {layer === 'reports' ? (
            <>
              <FilterSelect
                id="map-status"
                label="Status"
                value={query.status ?? ''}
                onChange={(value) => setSearchParams(setParam(searchParams, 'status', value))}
              >
                <option value="">All statuses</option>
                {REPORT_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {STATUS_LABELS[value]}
                  </option>
                ))}
              </FilterSelect>
              <FilterSelect
                id="map-category"
                label="Category"
                value={query.category_id ?? ''}
                onChange={(value) => setSearchParams(setParam(searchParams, 'category_id', value))}
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {catalogDisplayName(category)}
                  </option>
                ))}
              </FilterSelect>
              <FilterSelect
                id="map-priority"
                label="Priority"
                value={query.priority ?? ''}
                onChange={(value) => setSearchParams(setParam(searchParams, 'priority', value))}
              >
                <option value="">All priorities</option>
                {REPORT_PRIORITIES.map((value) => (
                  <option key={value} value={value}>
                    {PRIORITY_LABELS[value]}
                  </option>
                ))}
              </FilterSelect>
              <FilterSelect
                id="map-department"
                label="Department"
                value={query.department_id ?? ''}
                onChange={(value) => setSearchParams(setParam(searchParams, 'department_id', value))}
              >
                <option value="">All departments</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {catalogDisplayName(department)}
                  </option>
                ))}
              </FilterSelect>
            </>
          ) : null}
          <div>
            <Label htmlFor="map-from">From</Label>
            <Input
              id="map-from"
              type="date"
              className="mt-1.5"
              value={query.date_from ?? ''}
              onChange={(event) => setSearchParams(setParam(searchParams, 'date_from', event.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="map-to">To</Label>
            <Input
              id="map-to"
              type="date"
              className="mt-1.5"
              value={query.date_to ?? ''}
              onChange={(event) => setSearchParams(setParam(searchParams, 'date_to', event.target.value))}
            />
          </div>
        </div>
        ) : null}
      </Card>

      {error ? (
        <p className="rounded-md border border-danger-500/30 bg-danger-50 px-3 py-2 text-sm text-danger-700" role="alert">
          {error}
        </p>
      ) : null}

      <Card className="overflow-hidden">
        {!isTomTomConfigured ? (
          <EmptyState
            icon={<MapPinned className="size-6" />}
            title="TomTom API key required"
            description="Add VITE_TOMTOM_API_KEY from my.tomtom.com to .env to load the Kidapawan City map."
          />
        ) : (
          <>
            {loading ? <Skeleton className="mx-4 mt-4 h-8" /> : null}
            <Suspense fallback={<Skeleton className="h-[min(75vh,36rem)] w-full rounded-none" />}>
              <AdminMapCanvas layer={layer} reports={reports} clusters={clusters} focusTicket={focusTicket} />
            </Suspense>
            <p className="px-4 py-3 text-xs text-ink-400">
              {layer === 'reports'
                ? reports.length === 0
                  ? 'No report pins in this filter. Tickets need a saved latitude and longitude to appear.'
                  : `${reports.length} report location${reports.length === 1 ? '' : 's'} in this filter.`
                : clusters.length === 0
                  ? 'No approximate access areas in this range.'
                  : `${clusters.length} approximate access area${clusters.length === 1 ? '' : 's'} in this range.`}
            </p>
          </>
        )}
      </Card>
    </div>
  )
}

function LayerButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        active
          ? 'rounded-full bg-pine-800 px-4 py-2 text-sm font-semibold text-white'
          : 'rounded-full border border-ink-200 bg-white px-4 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50'
      }
    >
      {children}
    </button>
  )
}

function FilterSelect({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  children: ReactNode
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Select id={id} className="mt-1.5" value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </Select>
    </div>
  )
}
