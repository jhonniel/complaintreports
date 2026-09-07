import { ChevronDown } from 'lucide-react'
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { AdminReportDetail, DepartmentOption, StaffOption } from '@shared/adminReport'
import { GENDER_LABELS, STATUS_LABELS, formatDaysWithDepartment, normalizeTicketNumber } from '@shared/report'
import { googleMapsNavigateUrl } from '@shared/siteAddress'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton'
import { ReportActionModals, type ReportAction } from '@/features/admin/ReportActionModals'
import { PriorityBadge, StatusBadge } from '@/features/admin/ReportBadges'
import { fetchAdminReport, fetchDepartments, fetchStaff } from '@/features/admin/reportApi'
import { useAuth } from '@/features/auth/AuthProvider'
import { isTomTomConfigured } from '@/lib/tomtom'
import { ApiError } from '@/services/api'
import { formatDateTime, formatIsoDate, formatShortDate } from '@/utils/format'
import { canAssignReports, canDeleteReports, canViewComplainantInfo, canViewStatusHistory } from '@shared/auth'

const AdminMapCanvas = lazy(() =>
  import('@/features/admin/AdminMapCanvas').then((module) => ({ default: module.AdminMapCanvas })),
)

export function AdminReportDetailPage() {
  const { ticketNumber: rawTicket = '' } = useParams()
  const ticketNumber = normalizeTicketNumber(rawTicket)
  const navigate = useNavigate()
  const { profile } = useAuth()
  const canDelete = profile ? canDeleteReports(profile.role) : false
  const canAssign = profile ? canAssignReports(profile.role) : false
  const canViewHistory = profile ? canViewStatusHistory(profile.role) : false
  const canViewComplainant = profile ? canViewComplainantInfo(profile.role) : false
  const [report, setReport] = useState<AdminReportDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [departments, setDepartments] = useState<DepartmentOption[]>([])
  const [staff, setStaff] = useState<StaffOption[]>([])
  const [action, setAction] = useState<ReportAction | null>(null)
  const [complaintInfoOpen, setComplaintInfoOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([fetchAdminReport(ticketNumber), fetchDepartments(), fetchStaff()])
      .then(([detail, departmentResponse, staffResponse]) => {
        if (cancelled) return
        setReport(detail)
        setDepartments(departmentResponse.departments)
        setStaff(staffResponse.staff)
      })
      .catch((err) => {
        if (cancelled) return
        setReport(null)
        if (err instanceof ApiError && err.status === 404) setError('Report not found.')
        else setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [ticketNumber])

  useEffect(() => {
    if (loading || !report) return
    const hash = window.location.hash
    if (hash !== '#location' && hash !== '#report-map') return
    const frame = window.requestAnimationFrame(() => {
      document.getElementById('report-map')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [loading, report?.ticket_number])

  const mapReports = useMemo(() => {
    if (!report?.location) return []
    return [
      {
        ticket_number: report.ticket_number,
        category_name: report.category_name,
        status: report.status,
        priority: report.priority,
        created_at: report.created_at,
        latitude: report.location.latitude,
        longitude: report.location.longitude,
        address: report.reporter.address,
      },
    ]
  }, [report])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Card>
          <CardBody>
            <SkeletonText lines={6} />
          </CardBody>
        </Card>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="space-y-4">
        <Link to="/admin/reports" className="text-sm font-semibold text-pine-800 hover:underline">
          Back to reports
        </Link>
        <p className="rounded-md border border-danger-500/30 bg-danger-50 px-3 py-2 text-sm text-danger-700" role="alert">
          {error ?? 'Report not found.'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link to="/admin/reports" className="text-sm font-semibold text-pine-800 hover:underline">
            Back to reports
          </Link>
          <h1 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">{report.ticket_number}</h1>
          <p className="mt-1 text-sm text-ink-500">{report.title}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusBadge status={report.status} />
            <PriorityBadge priority={report.priority} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setAction('status')}>
            Update status
          </Button>
          <Button size="sm" variant="outline" onClick={() => setAction('priority')}>
            Priority
          </Button>
          {canAssign ? (
          <Button size="sm" variant="outline" onClick={() => setAction('assign')}>
            Assign
          </Button>
          ) : null}
          {canViewComplainant ? (
          <Button size="sm" onClick={() => setAction('note')}>
            Add note
          </Button>
          ) : null}
          {canDelete ? (
            <Button size="sm" variant="danger" onClick={() => setAction('delete')}>
              Delete
            </Button>
          ) : null}
        </div>
      </div>

      <div className={canViewComplainant ? 'grid gap-4 xl:grid-cols-2' : undefined}>
        <Card className="overflow-hidden border-pine-200 bg-pine-50/40">
          <CardHeader className="border-pine-200 bg-pine-800">
            <CardTitle className="text-white">Complaint</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4 text-sm">
            <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <Detail label="Ticket number" value={report.ticket_number} />
              <Detail label="Category" value={report.category_name} />
              <div>
                <p className="text-xs font-semibold tracking-wide text-ink-500 uppercase">Status</p>
                <div className="mt-1">
                  <StatusBadge status={report.status} />
                </div>
              </div>
              <Detail label="Date submitted" value={formatDateTime(report.created_at)} />
              <Detail label="Last updated" value={formatDateTime(report.updated_at)} />
              <Detail label="Site address" value={report.reporter.address} className="sm:col-span-2" />
            </div>
            <div className="rounded-lg border border-pine-100 bg-white/80 p-3">
              <p className="text-xs font-semibold tracking-wide text-ink-500 uppercase">Description</p>
              <p className="mt-1 whitespace-pre-wrap text-ink-800">{report.description}</p>
            </div>
          </CardBody>
        </Card>

        {canViewComplainant ? (
        <Card className="overflow-hidden border-earth-400 bg-earth-50/70">
          <CardHeader className={complaintInfoOpen ? 'border-earth-400 bg-earth-500 p-0' : 'border-earth-400 border-b-0 bg-earth-500 p-0'}>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
              aria-expanded={complaintInfoOpen}
              aria-controls="complaint-info-panel"
              onClick={() => setComplaintInfoOpen((open) => !open)}
            >
              <span className="font-display text-xl font-semibold text-ink-950">Complainant Info</span>
              <ChevronDown
                className={`size-5 shrink-0 text-ink-950 transition-transform ${complaintInfoOpen ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </button>
          </CardHeader>
          {complaintInfoOpen ? (
          <CardBody id="complaint-info-panel" className="space-y-4 text-sm">
            <p className="rounded-md bg-white/80 px-3 py-2 text-xs font-medium text-earth-700">
              Visible only to authorized administrators.
            </p>
            <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <Detail label="Full name" value={report.reporter.full_name} />
              <Detail label="Birth date" value={formatIsoDate(report.reporter.birth_date)} />
              <Detail label="Gender" value={GENDER_LABELS[report.reporter.gender]} />
              <Detail label="Phone" value={report.reporter.phone} />
              <Detail label="Email" value={report.reporter.email || 'Not provided'} className="sm:col-span-2" />
            </div>
          </CardBody>
          ) : null}
        </Card>
        ) : null}
      </div>

      <Card id="report-map" className="overflow-hidden border-spring-400/50">
        <CardHeader className="border-spring-100 bg-spring-50">
          <CardTitle className="text-spring-700">Location</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3 text-sm">
          {report.location ? (
            <>
              <div className="grid grid-cols-3 gap-3">
                <Detail className="min-w-0" label="Latitude" value={report.location.latitude.toFixed(6)} />
                <Detail className="min-w-0" label="Longitude" value={report.location.longitude.toFixed(6)} />
                {report.location.captured_at ? (
                  <Detail
                    className="min-w-0"
                    label="Pinned at"
                    value={formatDateTime(report.location.captured_at)}
                  />
                ) : null}
              </div>
              <Link
                className="inline-block font-semibold text-pine-800 hover:underline"
                to={`/admin/map?ticket=${encodeURIComponent(report.ticket_number)}`}
              >
                Open full map
              </Link>
              <a
                className="ml-4 inline-block font-semibold text-pine-800 hover:underline"
                href={googleMapsNavigateUrl(report.location.latitude, report.location.longitude)}
                target="_blank"
                rel="noreferrer"
              >
                Navigate in Google Maps
              </a>
            </>
          ) : (
            <p className="text-ink-500">
              No map pin yet. If the site address can be geocoded, a pin still appears on the admin
              map.
            </p>
          )}
        </CardBody>
        {report.location && isTomTomConfigured ? (
          <Suspense fallback={<Skeleton className="h-72 w-full rounded-none" />}>
            <AdminMapCanvas
              compact
              layer="reports"
              reports={mapReports}
              clusters={[]}
              focusTicket={report.ticket_number}
            />
          </Suspense>
        ) : report.location && !isTomTomConfigured ? (
          <p className="border-t border-ink-100 px-5 py-3 text-sm text-ink-500">
            Add a TomTom API key to show this pin on the map.
          </p>
        ) : null}
      </Card>

      {canViewComplainant ? (
      <Card className="overflow-hidden border-ink-200">
        <CardHeader className="border-ink-100 bg-ink-50">
          <CardTitle className="text-ink-900">Photos</CardTitle>
        </CardHeader>
        <CardBody>
          {report.photos.length > 0 ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {report.photos.map((photo, index) => (
                <li key={photo.id}>
                  <a href={photo.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-ink-200">
                    <img
                      src={photo.url}
                      alt={`Report photo ${index + 1}`}
                      className="h-36 w-full object-cover"
                    />
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-500">No photos were attached to this report.</p>
          )}
        </CardBody>
      </Card>
      ) : null}

      {canViewComplainant ? (
      <div className={canViewHistory ? 'grid gap-4 xl:grid-cols-2' : undefined}>
        <Card className="overflow-hidden border-info-500/30">
          <CardHeader className="border-info-500/20 bg-info-50">
            <CardTitle className="text-info-600">Internal management</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4 text-sm">
            <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <Detail label="Assigned department" value={report.assigned_department_name ?? 'Unassigned'} />
              <Detail
                label="Days with department"
                value={
                  report.assigned_department_id
                    ? formatDaysWithDepartment(report.department_assigned_at) ?? 'Assigned'
                    : 'Not assigned'
                }
              />
              <Detail label="Assigned staff" value={report.assigned_admin_name ?? 'Unassigned'} className="sm:col-span-2" />
            </div>
            <div>
              <p className="text-xs font-semibold tracking-wide text-ink-500 uppercase">Internal notes</p>
              {report.notes.length === 0 ? (
                <p className="mt-2 text-ink-500">No internal notes yet.</p>
              ) : (
                <ul className="mt-2 space-y-3">
                  {report.notes.map((item) => (
                    <li key={item.id} className="rounded-md border border-ink-100 p-3">
                      <p className="whitespace-pre-wrap">{item.note}</p>
                      <p className="mt-1 text-xs text-ink-400">
                        {item.actor_name} · {formatDateTime(item.created_at)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardBody>
        </Card>

        {canViewHistory ? (
        <Card className="overflow-hidden border-warn-500/30">
          <CardHeader className="border-warn-500/20 bg-warn-50">
            <CardTitle className="text-warn-600">Status history</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="mb-3 rounded-md bg-white/80 px-3 py-2 text-xs font-medium text-warn-600">
              Visible only to administrators.
            </p>
            {report.history.length === 0 ? (
              <p className="text-sm text-ink-500">No status history yet.</p>
            ) : (
              <ol className="space-y-3">
                {report.history.map((item) => (
                  <li key={item.id} className="border-l-2 border-pine-200 pl-3 text-sm">
                    <p className="font-semibold">
                      {item.previous_status ? `${STATUS_LABELS[item.previous_status]} → ` : ''}
                      {STATUS_LABELS[item.new_status]}
                    </p>
                    <p className="text-xs text-ink-400">
                      {formatShortDate(item.created_at)} — {item.actor_name}
                    </p>
                    {item.note ? <p className="mt-1 text-ink-600">{item.note}</p> : null}
                  </li>
                ))}
              </ol>
            )}
          </CardBody>
        </Card>
        ) : null}
      </div>
      ) : null}

      <ReportActionModals
        ticketNumber={report.ticket_number}
        action={action}
        status={report.status}
        priority={report.priority}
        departmentId={report.assigned_department_id}
        adminId={report.assigned_admin_id}
        departments={departments}
        staff={staff}
        onClose={() => setAction(null)}
        onSaved={setReport}
        onDeleted={() => navigate('/admin/reports', { replace: true })}
      />
    </div>
  )
}

function Detail({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <p className="text-xs font-semibold tracking-wide text-ink-500 uppercase">{label}</p>
      <p className="mt-1 text-ink-800">{value}</p>
    </div>
  )
}
