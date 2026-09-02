import type { ReportStatus } from '@shared/report'
import type { AdminRole } from '@shared/auth'

export {
  GENDERS,
  GENDER_LABELS,
  REPORT_PRIORITIES,
  PRIORITY_LABELS,
  REPORT_STATUSES,
  STATUS_LABELS,
  type Gender,
  type ReportPriority,
  type ReportStatus,
} from '@shared/report'

export { ADMIN_ROLES, ROLE_LABELS, type AdminRole } from '@shared/auth'

export interface ReportCategory {
  id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
}

export interface Department {
  id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
}

export interface PublicReportView {
  ticket_number: string
  category_name: string
  status: ReportStatus
  created_at: string
  updated_at: string
}

export interface AdminProfile {
  id: string
  user_id: string
  full_name: string
  role: AdminRole
  created_at: string
  updated_at: string
}

export interface ApiErrorBody {
  error: string
  details?: unknown
}

export interface ApiHealthResponse {
  status: 'ok' | 'degraded'
  service: string
  phase: number
  supabase: 'configured' | 'not_configured'
  timestamp: string
}
