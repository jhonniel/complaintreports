import { lazy, Suspense, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { AdminReportDetail, DepartmentOption, StaffOption } from '@shared/adminReport'
import { GENDER_LABELS, STATUS_LABELS, normalizeTicketNumber } from '@shared/report'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton'
import { ReportActionModals, type ReportAction } from '@/features/admin/ReportActionModals'
import { PriorityBadge, StatusBadge } from '@/features/admin/ReportBadges'
import { fetchAdminReport, fetchDepartments, fetchStaff } from '@/features/admin/reportApi'
import { isTomTomConfigured } from '@/lib/tomtom'
import { ApiError } from '@/services/api'
import { formatDateTime, formatIsoDate, formatShortDate } from '@/utils/format'

const AdminMapCanvas = lazy(() =>
  import('@/features/admin/AdminMapCanvas').then((module) => ({ default: module.AdminMapCanvas })),
)

export function AdminReportDetailPage() {
  const { ticketNumber: rawTicket = '' } = useParams()
  const ticketNumber = normalizeTicketNumber(rawTicket)
  const [report, setReport] = useState<AdminReportDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [departments, setDepartments] = useState<DepartmentOption[]>([])
  const [staff, setStaff] = useState<StaffOption[]>([])
  const [action, setAction] = useState<ReportAction | null>(null)

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
          <h1 className="mt-2 font-display text-3xl font-semibold">{report.ticket_number}</h1>
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
          <Button size="sm" variant="outline" onClick={() => setAction('assign')}>
            Assign
          </Button>
          <Button size="sm" onClick={() => setAction('note')}>
            Add note
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Report information</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3 text-sm">
            <Detail label="Ticket number" value={report.ticket_number} />
            <Detail label="Category" value={report.category_name} />
            <Detail label="Status" value={STATUS_LABELS[report.status]} />
            <Detail label="Date submitted" value={formatDateTime(report.created_at)} />
            <Detail label="Last updated" value={formatDateTime(report.updated_at)} />
            <div>
              <p className="text-xs font-semibold tracking-wide text-ink-500 uppercase">Description</p>
              <p className="mt-1 whitespace-pre-wrap text-ink-800">{report.description}</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reporter information</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3 text-sm">
            <p className="rounded-md bg-earth-50 px-3 py-2 text-xs text-earth-700">
              Visible only to authorized administrators.
            </p>
            <Detail label="Full name" value={report.reporter.full_name} />
            <Detail label="Birth date" value={formatIsoDate(report.reporter.birth_date)} />
            <Detail label="Gender" value={GENDER_LABELS[report.reporter.gender]} />
            <Detail label="Address" value={report.reporter.address} />
            <Detail label="Phone" value={report.reporter.phone} />
            <Detail label="Email" value={report.reporter.email || 'Not provided'} />
          </CardBody>
        </Card>
      </div>

      <Card id="location" className="overflow-hidden">
        <CardHeader>
          <CardTitle>Location</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3 text-sm">
          {report.location ? (
            <>
              <p className="text-ink-600">
                This pin is the latitude and longitude saved with the ticket, so staff can find the
                report on the city map.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Detail label="Latitude" value={report.location.latitude.toFixed(6)} />
                <Detail label="Longitude" value={report.location.longitude.toFixed(6)} />
              </div>
              {report.location.accuracy != null ? (
                <Detail label="Accuracy" value={`${Math.round(report.location.accuracy)} m`} />
              ) : null}
              {report.location.captured_at ? (
                <Detail label="Captured" value={formatDateTime(report.location.captured_at)} />
              ) : null}
              <Link
                className="inline-block font-semibold text-pine-800 hover:underline"
                to={`/admin/map?ticket=${encodeURIComponent(report.ticket_number)}`}
              >
                Open full map
              </Link>
            </>
          ) : (
            <p className="text-ink-500">
              No GPS was captured. If the address can be mapped, a pin still appears on the admin
              map.
            </p>
          )}
        </CardBody>
        {report.location && isTomTomConfigured ? (
          <Suspense fallback={<Skeleton className="h-72 w-full rounded-none" />}>
            <AdminMapCanvas
              compact
              layer="reports"
              reports={[
                {
                  ticket_number: report.ticket_number,
                  category_name: report.category_name,
                  status: report.status,
                  priority: report.priority,
                  created_at: report.created_at,
                  latitude: report.location.latitude,
                  longitude: report.location.longitude,
                },
              ]}
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

      <Card>
        <CardHeader>
          <CardTitle>Photos</CardTitle>
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

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Internal management</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3 text-sm">
            <Detail label="Assigned department" value={report.assigned_department_name ?? 'Unassigned'} />
            <Detail label="Assigned staff" value={report.assigned_admin_name ?? 'Unassigned'} />
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

        <Card>
          <CardHeader>
            <CardTitle>Status history</CardTitle>
          </CardHeader>
          <CardBody>
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
      </div>

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
      />
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-wide text-ink-500 uppercase">{label}</p>
      <p className="mt-1 text-ink-800">{value}</p>
    </div>
  )
}
