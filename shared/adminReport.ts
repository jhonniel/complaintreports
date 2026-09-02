import { z } from 'zod'
import type { AdminRole } from './auth.ts'
import {
  REPORT_PRIORITIES,
  REPORT_STATUSES,
  type Gender,
  type ReportPriority,
  type ReportStatus,
} from './report.ts'

export const ADMIN_REPORT_SORTS = [
  'created_at',
  'updated_at',
  'ticket_number',
  'priority',
  'status',
] as const

export type AdminReportSort = (typeof ADMIN_REPORT_SORTS)[number]

export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isUuid(value: string) {
  return UUID_PATTERN.test(value)
}

export interface AdminActorRef {
  userId: string
  fullName: string
  role: AdminRole
}

export interface DepartmentOption {
  id: string
  name: string
  is_active: boolean
}

export interface StaffOption {
  user_id: string
  full_name: string
  role: AdminRole
}

export interface AdminReportListQuery {
  q: string
  status: ReportStatus | null
  category_id: string | null
  priority: ReportPriority | null
  department_id: string | null
  date_from: string | null
  date_to: string | null
  sort: AdminReportSort
  order: 'asc' | 'desc'
  page: number
  page_size: number
}

export interface AdminReportListItem {
  id: string
  ticket_number: string
  title: string
  category_name: string
  status: ReportStatus
  priority: ReportPriority
  has_location: boolean
  assigned_department_id: string | null
  assigned_department_name: string | null
  assigned_admin_id: string | null
  assigned_admin_name: string | null
  created_at: string
  updated_at: string
}

export interface AdminReportListResult {
  items: AdminReportListItem[]
  page: number
  page_size: number
  total: number
  total_pages: number
}

export interface AdminStatusHistoryItem {
  id: string
  previous_status: ReportStatus | null
  new_status: ReportStatus
  note: string | null
  actor_name: string
  created_at: string
}

export interface AdminNoteItem {
  id: string
  note: string
  actor_name: string
  created_at: string
}

export interface AdminReportDetail {
  id: string
  ticket_number: string
  title: string
  description: string
  category_id: string
  category_name: string
  status: ReportStatus
  priority: ReportPriority
  reporter: {
    full_name: string
    birth_date: string
    gender: Gender
    address: string
    phone: string
    email: string | null
  }
  location: {
    latitude: number
    longitude: number
    accuracy: number | null
    captured_at: string | null
  } | null
  assigned_department_id: string | null
  assigned_department_name: string | null
  assigned_admin_id: string | null
  assigned_admin_name: string | null
  created_at: string
  updated_at: string
  history: AdminStatusHistoryItem[]
  notes: AdminNoteItem[]
}

const optionalUuid = z
  .union([z.string().uuid(), z.null()])
  .optional()

export const updateStatusSchema = z.object({
  status: z.enum(REPORT_STATUSES, { error: 'Choose a valid status' }),
  note: z
    .string()
    .trim()
    .max(2000, 'Note is too long')
    .optional(),
})

export const updatePrioritySchema = z.object({
  priority: z.enum(REPORT_PRIORITIES, { error: 'Choose a valid priority' }),
})

export const assignReportSchema = z
  .object({
    department_id: optionalUuid,
    admin_id: optionalUuid,
  })
  .refine((value) => value.department_id !== undefined || value.admin_id !== undefined, {
    message: 'Choose a department or staff member.',
  })

export const addNoteSchema = z.object({
  note: z
    .string()
    .trim()
    .min(1, 'Enter a note')
    .max(2000, 'Note is too long'),
})

export type UpdateStatusInput = z.infer<typeof updateStatusSchema>
export type UpdatePriorityInput = z.infer<typeof updatePrioritySchema>
export type AssignReportInput = z.infer<typeof assignReportSchema>
export type AddNoteInput = z.infer<typeof addNoteSchema>

const DATE_DAY = /^\d{4}-\d{2}-\d{2}$/

export function parseAdminReportListQuery(input: Record<string, unknown>): AdminReportListQuery {
  const q = typeof input.q === 'string' ? input.q.trim().slice(0, 120) : ''
  const status = REPORT_STATUSES.includes(input.status as ReportStatus)
    ? (input.status as ReportStatus)
    : null
  const category_id = typeof input.category_id === 'string' && isUuid(input.category_id) ? input.category_id : null
  const priority = REPORT_PRIORITIES.includes(input.priority as ReportPriority)
    ? (input.priority as ReportPriority)
    : null
  const department_id =
    typeof input.department_id === 'string' && isUuid(input.department_id) ? input.department_id : null
  const date_from = typeof input.date_from === 'string' && DATE_DAY.test(input.date_from) ? input.date_from : null
  const date_to = typeof input.date_to === 'string' && DATE_DAY.test(input.date_to) ? input.date_to : null
  const sort = ADMIN_REPORT_SORTS.includes(input.sort as AdminReportSort)
    ? (input.sort as AdminReportSort)
    : 'updated_at'
  const order = input.order === 'asc' ? 'asc' : 'desc'
  const pageRaw = Number(input.page)
  const sizeRaw = Number(input.page_size)
  const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1
  const page_size = Number.isInteger(sizeRaw) && sizeRaw > 0 ? Math.min(sizeRaw, 50) : 10

  return { q, status, category_id, priority, department_id, date_from, date_to, sort, order, page, page_size }
}
