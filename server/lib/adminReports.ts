import { MANILA_TIME_ZONE, PRIORITY_RANK, normalizeTicketNumber, type ReportPriority, type ReportStatus } from '../../shared/report.ts'
import type {
  AdminReportDetail,
  AdminReportListItem,
  AdminReportListQuery,
  AdminReportListResult,
  AdminReportSort,
} from '../../shared/adminReport.ts'

export interface AdminReportRecord {
  id: string
  ticket_number: string
  title: string
  description: string
  category_id: string
  category_name: string
  status: ReportStatus
  priority: ReportPriority
  latitude: number | null
  longitude: number | null
  assigned_department_id: string | null
  assigned_department_name: string | null
  assigned_admin_id: string | null
  assigned_admin_name: string | null
  created_at: string
  updated_at: string
}

export class ReportNotFoundError extends Error {
  constructor() {
    super('Report not found.')
    this.name = 'ReportNotFoundError'
  }
}

export class DepartmentNotFoundError extends Error {
  constructor() {
    super('Please choose a valid department.')
    this.name = 'DepartmentNotFoundError'
  }
}

export class StaffNotFoundError extends Error {
  constructor() {
    super('Please choose a valid staff member.')
    this.name = 'StaffNotFoundError'
  }
}

export function manilaDateKey(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: MANILA_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  )
  return `${parts.year}-${parts.month}-${parts.day}`
}

function compareValues(sort: AdminReportSort, a: AdminReportRecord, b: AdminReportRecord) {
  if (sort === 'priority') return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
  if (sort === 'status' || sort === 'ticket_number') return a[sort].localeCompare(b[sort])
  return a[sort].localeCompare(b[sort])
}

export function toListItem(record: AdminReportRecord): AdminReportListItem {
  return {
    id: record.id,
    ticket_number: record.ticket_number,
    title: record.title,
    category_name: record.category_name,
    status: record.status,
    priority: record.priority,
    has_location: record.latitude != null && record.longitude != null,
    assigned_department_id: record.assigned_department_id,
    assigned_department_name: record.assigned_department_name,
    assigned_admin_id: record.assigned_admin_id,
    assigned_admin_name: record.assigned_admin_name,
    created_at: record.created_at,
    updated_at: record.updated_at,
  }
}

export function filterAdminReports(records: AdminReportRecord[], query: AdminReportListQuery) {
  const needle = query.q.trim().toLowerCase()
  return records.filter((record) => {
    if (query.status && record.status !== query.status) return false
    if (query.category_id && record.category_id !== query.category_id) return false
    if (query.priority && record.priority !== query.priority) return false
    if (query.department_id && record.assigned_department_id !== query.department_id) return false
    if (query.date_from && manilaDateKey(record.created_at) < query.date_from) return false
    if (query.date_to && manilaDateKey(record.created_at) > query.date_to) return false
    if (!needle) return true
    const ticketNeedle = normalizeTicketNumber(query.q).toLowerCase()
    const haystack = [record.ticket_number, record.category_name, record.title, record.description]
      .join(' ')
      .toLowerCase()
    return haystack.includes(needle) || record.ticket_number.toLowerCase().includes(ticketNeedle)
  })
}

export function paginateAdminReports(
  records: AdminReportRecord[],
  query: AdminReportListQuery,
): AdminReportListResult {
  let filtered = filterAdminReports(records, query)

  filtered = [...filtered].sort((a, b) => {
    const result = compareValues(query.sort, a, b)
    return query.order === 'asc' ? result : -result
  })

  const total = filtered.length
  const total_pages = Math.max(1, Math.ceil(total / query.page_size))
  const page = Math.min(query.page, total_pages)
  const start = (page - 1) * query.page_size
  const items = filtered.slice(start, start + query.page_size).map(toListItem)

  return { items, page, page_size: query.page_size, total, total_pages: total === 0 ? 0 : total_pages }
}

export function asCoordinate(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

export function locationFrom(record: {
  latitude: number | null
  longitude: number | null
  location_accuracy?: number | null
  location_captured_at?: string | null
}): AdminReportDetail['location'] {
  if (record.latitude == null || record.longitude == null) return null
  return {
    latitude: record.latitude,
    longitude: record.longitude,
    accuracy: record.location_accuracy ?? null,
    captured_at: record.location_captured_at ?? null,
  }
}
