import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  parseAdminReportListQuery,
  type AdminReportListItem,
  type AdminReportListQuery,
  type AdminReportSort,
  type DepartmentOption,
  type StaffOption,
} from '@shared/adminReport'
import {
  PRIORITY_LABELS,
  REPORT_PRIORITIES,
  REPORT_STATUSES,
  STATUS_LABELS,
  isTicketNumber,
  normalizeTicketNumber,
} from '@shared/report'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table'
import { ReportActionModals, type ReportAction } from '@/features/admin/ReportActionModals'
import { PriorityBadge, StatusBadge } from '@/features/admin/ReportBadges'
import { fetchAdminCategories, catalogDisplayName, fetchAdminDepartments } from '@/features/admin/catalogApi'
import { fetchAdminReports, fetchStaff } from '@/features/admin/reportApi'
import { useAuth } from '@/features/auth/AuthProvider'
import { ApiError } from '@/services/api'
import { formatDateTime, formatShortDate } from '@/utils/format'
import { canAssignReports, canDeleteReports } from '@shared/auth'

function queryFromParams(params: URLSearchParams): AdminReportListQuery {
  return parseAdminReportListQuery(Object.fromEntries(params.entries()))
}

function setParam(params: URLSearchParams, key: string, value: string) {
  const next = new URLSearchParams(params)
  if (value) next.set(key, value)
  else next.delete(key)
  if (key !== 'page') next.delete('page')
  return next
}

export function AdminReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const canDelete = profile ? canDeleteReports(profile.role) : false
  const canAssign = profile ? canAssignReports(profile.role) : false
  const staffDepartmentId = profile?.role === 'staff' ? profile.departmentId : null
  const query = useMemo(() => queryFromParams(searchParams), [searchParams])
  const [searchInput, setSearchInput] = useState(query.q)
  const [items, setItems] = useState<AdminReportListItem[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [categories, setCategories] = useState<{ id: string; name: string; is_active: boolean }[]>([])
  const [departments, setDepartments] = useState<DepartmentOption[]>([])
  const [staff, setStaff] = useState<StaffOption[]>([])
  const [action, setAction] = useState<ReportAction | null>(null)
  const [active, setActive] = useState<AdminReportListItem | null>(null)

  useEffect(() => {
    setSearchInput(query.q)
  }, [query.q])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (searchInput === query.q) return
      setSearchParams(setParam(searchParams, 'q', searchInput), { replace: true })
    }, 300)
    return () => window.clearTimeout(timer)
  }, [searchInput, query.q, searchParams, setSearchParams])

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchAdminCategories(), fetchAdminDepartments(), fetchStaff()])
      .then(([categoryResponse, departmentResponse, staffResponse]) => {
        if (cancelled) return
        setCategories(categoryResponse.categories)
        setDepartments(departmentResponse.departments)
        setStaff(staffResponse.staff)
      })
      .catch(() => {
        /* Filters are optional; the table still loads. */
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchAdminReports(query)
      .then((result) => {
        if (cancelled) return
        setItems(result.items)
        setTotal(result.total)
        setTotalPages(result.total_pages)
        setPage(result.page)
      })
      .catch((err) => {
        if (cancelled) return
        setItems([])
        setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [query])

  function sortBy(field: AdminReportSort) {
    const next = new URLSearchParams(searchParams)
    if (query.sort === field) {
      next.set('order', query.order === 'asc' ? 'desc' : 'asc')
    } else {
      next.set('sort', field)
      next.set('order', field === 'ticket_number' ? 'asc' : 'desc')
    }
    next.delete('page')
    setSearchParams(next)
  }

  function sortLabel(field: AdminReportSort, label: string) {
    if (query.sort !== field) return label
    return `${label} ${query.order === 'asc' ? '↑' : '↓'}`
  }

  const activeTicket = active?.ticket_number ?? ''

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl font-semibold">Reports</h1>
        <p className="mt-1 text-sm text-ink-500">
          {staffDepartmentId
            ? 'Showing tickets assigned to your department. Update status and add notes to take action.'
            : 'Assign a ticket to a department so that office can take action. Personal details stay on the report page.'}
        </p>
      </div>

      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="md:col-span-2">
            <form
              onSubmit={(event) => {
                event.preventDefault()
                const ticket = normalizeTicketNumber(searchInput)
                if (isTicketNumber(ticket)) {
                  navigate(`/admin/reports/${encodeURIComponent(ticket)}`)
                  return
                }
                setSearchParams(setParam(searchParams, 'q', searchInput), { replace: true })
              }}
            >
              <Label htmlFor="report-search">Search</Label>
              <Input
                id="report-search"
                className="mt-1.5"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Ticket number, category, or report text"
                name="q"
                enterKeyHint="search"
              />
            </form>
          </div>
          <div>
            <Label htmlFor="filter-status">Status</Label>
            <Select
              id="filter-status"
              className="mt-1.5"
              value={query.status ?? ''}
              onChange={(event) => setSearchParams(setParam(searchParams, 'status', event.target.value))}
            >
              <option value="">All statuses</option>
              {REPORT_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {STATUS_LABELS[value]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="filter-priority">Priority</Label>
            <Select
              id="filter-priority"
              className="mt-1.5"
              value={query.priority ?? ''}
              onChange={(event) => setSearchParams(setParam(searchParams, 'priority', event.target.value))}
            >
              <option value="">All priorities</option>
              {REPORT_PRIORITIES.map((value) => (
                <option key={value} value={value}>
                  {PRIORITY_LABELS[value]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="filter-category">Category</Label>
            <Select
              id="filter-category"
              className="mt-1.5"
              value={query.category_id ?? ''}
              onChange={(event) => setSearchParams(setParam(searchParams, 'category_id', event.target.value))}
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {catalogDisplayName(category)}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="filter-department">Department</Label>
            <Select
              id="filter-department"
              className="mt-1.5"
              value={staffDepartmentId ?? query.department_id ?? ''}
              disabled={Boolean(staffDepartmentId)}
              onChange={(event) => setSearchParams(setParam(searchParams, 'department_id', event.target.value))}
            >
              <option value="">All departments</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {catalogDisplayName(department)}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="filter-from">From</Label>
            <Input
              id="filter-from"
              type="date"
              className="mt-1.5"
              value={query.date_from ?? ''}
              onChange={(event) => setSearchParams(setParam(searchParams, 'date_from', event.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="filter-to">To</Label>
            <Input
              id="filter-to"
              type="date"
              className="mt-1.5"
              value={query.date_to ?? ''}
              onChange={(event) => setSearchParams(setParam(searchParams, 'date_to', event.target.value))}
            />
          </div>
        </div>
      </Card>

      {error ? (
        <p className="rounded-md border border-danger-500/30 bg-danger-50 px-3 py-2 text-sm text-danger-700" role="alert">
          {error}
        </p>
      ) : null}

      <Card>
        <Table>
          <THead>
            <TR>
              <TH>
                <button type="button" className="font-semibold uppercase" onClick={() => sortBy('ticket_number')}>
                  {sortLabel('ticket_number', 'Ticket Number')}
                </button>
              </TH>
              <TH>Category</TH>
              <TH>
                <button type="button" className="font-semibold uppercase" onClick={() => sortBy('created_at')}>
                  {sortLabel('created_at', 'Date Submitted')}
                </button>
              </TH>
              <TH>
                <button type="button" className="font-semibold uppercase" onClick={() => sortBy('status')}>
                  {sortLabel('status', 'Status')}
                </button>
              </TH>
              <TH>
                <button type="button" className="font-semibold uppercase" onClick={() => sortBy('priority')}>
                  {sortLabel('priority', 'Priority')}
                </button>
              </TH>
              <TH>Location</TH>
              <TH>Assigned Department</TH>
              <TH>
                <button type="button" className="font-semibold uppercase" onClick={() => sortBy('updated_at')}>
                  {sortLabel('updated_at', 'Last Updated')}
                </button>
              </TH>
              <TH>Actions</TH>
            </TR>
          </THead>
          <TBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TR key={index}>
                  <TD colSpan={9}>
                    <Skeleton className="h-8 w-full" />
                  </TD>
                </TR>
              ))
            ) : items.length === 0 ? (
              <TR>
                <TD colSpan={9} className="p-0">
                  <EmptyState
                    title="No reports match these filters"
                    description="Submitted tickets appear here. Search looks at ticket numbers, categories, and report text only."
                  />
                </TD>
              </TR>
            ) : (
              items.map((item) => (
                <TR key={item.id}>
                  <TD className="font-semibold">
                    <Link className="text-pine-800 hover:underline" to={`/admin/reports/${item.ticket_number}`}>
                      {item.ticket_number}
                    </Link>
                    <p className="mt-0.5 max-w-48 truncate text-xs font-normal text-ink-500">{item.title}</p>
                  </TD>
                  <TD>{item.category_name}</TD>
                  <TD>{formatShortDate(item.created_at)}</TD>
                  <TD>
                    <StatusBadge status={item.status} />
                  </TD>
                  <TD>
                    <PriorityBadge priority={item.priority} />
                  </TD>
                  <TD>{item.has_location ? 'Captured' : 'Not captured'}</TD>
                  <TD>{item.assigned_department_name ?? 'Unassigned'}</TD>
                  <TD>{formatDateTime(item.updated_at)}</TD>
                  <TD>
                    <div className="flex flex-wrap gap-1">
                      <Link
                        className="inline-flex h-8 items-center px-2 text-sm font-semibold text-pine-800 hover:underline"
                        to={`/admin/reports/${item.ticket_number}`}
                      >
                        View
                      </Link>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2"
                        onClick={() => {
                          setActive(item)
                          setAction('status')
                        }}
                      >
                        Status
                      </Button>
                      {canAssign ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2"
                        onClick={() => {
                          setActive(item)
                          setAction('assign')
                        }}
                      >
                        Assign
                      </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2"
                        onClick={() => {
                          setActive(item)
                          setAction('note')
                        }}
                      >
                        Note
                      </Button>
                      {canDelete ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-danger-700 hover:bg-danger-50"
                          onClick={() => {
                            setActive(item)
                            setAction('delete')
                          }}
                        >
                          Delete
                        </Button>
                      ) : null}
                      <Link
                        className="inline-flex h-8 items-center px-2 text-sm font-semibold text-pine-800 hover:underline"
                        to={`/admin/reports/${item.ticket_number}#location`}
                      >
                        Location
                      </Link>
                    </div>
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
        <div className="flex items-center justify-between border-t border-ink-100 px-4 py-3 text-sm">
          <p className="text-ink-500">{total} report{total === 1 ? '' : 's'}</p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1 || loading}
              onClick={() => setSearchParams(setParam(searchParams, 'page', String(page - 1)))}
            >
              Previous
            </Button>
            <span>
              Page {totalPages === 0 ? 0 : page} of {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages || loading}
              onClick={() => setSearchParams(setParam(searchParams, 'page', String(page + 1)))}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      {active ? (
        <ReportActionModals
          ticketNumber={activeTicket}
          action={action}
          status={active.status}
          priority={active.priority}
          departmentId={active.assigned_department_id}
          adminId={active.assigned_admin_id}
          departments={departments}
          staff={staff}
          onClose={() => {
            setAction(null)
            setActive(null)
          }}
          onSaved={() => {
            void fetchAdminReports(query).then((result) => {
              setItems(result.items)
              setTotal(result.total)
              setTotalPages(result.total_pages)
              setPage(result.page)
            })
          }}
          onDeleted={() => {
            setAction(null)
            setActive(null)
            void fetchAdminReports(query).then((result) => {
              setItems(result.items)
              setTotal(result.total)
              setTotalPages(result.total_pages)
              setPage(result.page)
            })
          }}
        />
      ) : null}
    </div>
  )
}
