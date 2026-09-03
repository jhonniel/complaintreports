import type {
  AddNoteInput,
  AdminReportDetail,
  AdminReportListQuery,
  AdminReportListResult,
  AssignReportInput,
  StaffOption,
  UpdatePriorityInput,
  UpdateStatusInput,
} from '@shared/adminReport'
import type { CatalogItem } from '@shared/catalog'
import { api } from '@/services/api'

function listQuery(query: AdminReportListQuery) {
  const params = new URLSearchParams()
  if (query.q) params.set('q', query.q)
  if (query.status) params.set('status', query.status)
  if (query.category_id) params.set('category_id', query.category_id)
  if (query.priority) params.set('priority', query.priority)
  if (query.department_id) params.set('department_id', query.department_id)
  if (query.date_from) params.set('date_from', query.date_from)
  if (query.date_to) params.set('date_to', query.date_to)
  params.set('sort', query.sort)
  params.set('order', query.order)
  params.set('page', String(query.page))
  params.set('page_size', String(query.page_size))
  return params.toString()
}

export function fetchAdminReports(query: AdminReportListQuery) {
  return api.get<AdminReportListResult>(`/admin/reports?${listQuery(query)}`)
}

export function fetchAdminReport(ticketNumber: string) {
  return api.get<AdminReportDetail>(`/admin/reports/${encodeURIComponent(ticketNumber)}`)
}

export function updateReportStatus(ticketNumber: string, input: UpdateStatusInput) {
  return api.patch<AdminReportDetail>(`/admin/reports/${encodeURIComponent(ticketNumber)}/status`, input)
}

export function updateReportPriority(ticketNumber: string, input: UpdatePriorityInput) {
  return api.patch<AdminReportDetail>(`/admin/reports/${encodeURIComponent(ticketNumber)}/priority`, input)
}

export function assignReport(ticketNumber: string, input: AssignReportInput) {
  return api.patch<AdminReportDetail>(`/admin/reports/${encodeURIComponent(ticketNumber)}/assign`, input)
}

export function addReportNote(ticketNumber: string, input: AddNoteInput) {
  return api.post<AdminReportDetail>(`/admin/reports/${encodeURIComponent(ticketNumber)}/notes`, input)
}

export function deleteReport(ticketNumber: string) {
  return api.delete<{ ok: true }>(`/admin/reports/${encodeURIComponent(ticketNumber)}`)
}

export function fetchDepartments() {
  return api.get<{ departments: CatalogItem[] }>('/admin/departments')
}

export function fetchStaff() {
  return api.get<{ staff: StaffOption[] }>('/admin/staff')
}
