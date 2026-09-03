import type {
  AdminActorRef,
  AdminReportDetail,
  AdminReportListQuery,
  AdminReportListResult,
  AssignReportInput,
  StaffOption,
  UpdatePriorityInput,
  UpdateStatusInput,
} from '../../shared/adminReport.ts'
import type { AnalyticsQuery, AnalyticsResponse } from '../../shared/analytics.ts'
import type {
  CatalogCreateInput,
  CatalogItem,
  CatalogUpdateInput,
} from '../../shared/catalog.ts'
import type {
  AccessMapQuery,
  CreateAccessLogInput,
  MapAccessCluster,
  MapFilterQuery,
  MapReportPoint,
} from '../../shared/map.ts'
import type {
  FacebookConvertInput,
  FacebookImportCommentsResult,
  FacebookImportInput,
  FacebookIntakeItem,
  FacebookIntakeStatus,
  FacebookPostPreview,
} from '../../shared/facebookIntake.ts'
import type { FacebookConnectionRecord, FacebookOauthPage, FacebookOauthSessionRecord } from '../lib/facebookConnection.ts'
import type { CreateReportInput, PublicCategory, PublicTrackView } from '../../shared/report.ts'

export interface CreatedReport {
  id: string
  ticket_number: string
  status: 'submitted'
  created_at: string
  category_name: string
}

export interface StoredAccessLogInput extends CreateAccessLogInput {
  user_agent: string | null
}

export interface ReportStore {
  mode: 'local' | 'supabase'
  listPublicCategories(): Promise<PublicCategory[]>
  createReport(input: CreateReportInput): Promise<CreatedReport>
  findPublicByTicket(ticketNumber: string): Promise<PublicTrackView | null>
  getAnalytics(query: AnalyticsQuery): Promise<AnalyticsResponse>
  listAdminReports(query: AdminReportListQuery): Promise<AdminReportListResult>
  getAdminReport(ticketNumber: string): Promise<AdminReportDetail | null>
  updateReportStatus(
    ticketNumber: string,
    input: UpdateStatusInput,
    actor: AdminActorRef,
  ): Promise<AdminReportDetail>
  updateReportPriority(
    ticketNumber: string,
    input: UpdatePriorityInput,
    actor: AdminActorRef,
  ): Promise<AdminReportDetail>
  assignReport(
    ticketNumber: string,
    input: AssignReportInput,
    actor: AdminActorRef,
  ): Promise<AdminReportDetail>
  addReportNote(ticketNumber: string, note: string, actor: AdminActorRef): Promise<AdminReportDetail>
  deleteReport(ticketNumber: string, actor: AdminActorRef): Promise<void>
  listAdminCategories(): Promise<CatalogItem[]>
  createCategory(input: CatalogCreateInput): Promise<CatalogItem>
  updateCategory(id: string, input: CatalogUpdateInput): Promise<CatalogItem>
  listDepartments(): Promise<CatalogItem[]>
  createDepartment(input: CatalogCreateInput): Promise<CatalogItem>
  updateDepartment(id: string, input: CatalogUpdateInput): Promise<CatalogItem>
  listStaff(): Promise<StaffOption[]>
  createAccessLog(input: StoredAccessLogInput): Promise<void>
  listMapReports(query: MapFilterQuery): Promise<MapReportPoint[]>
  listMapAccess(query: AccessMapQuery): Promise<MapAccessCluster[]>
  listFacebookIntakes(status?: FacebookIntakeStatus): Promise<FacebookIntakeItem[]>
  createFacebookIntake(input: FacebookImportInput, actor: AdminActorRef): Promise<FacebookIntakeItem>
  convertFacebookIntake(
    id: string,
    input: FacebookConvertInput,
    actor: AdminActorRef,
  ): Promise<FacebookIntakeItem>
  dismissFacebookIntake(id: string, actor: AdminActorRef): Promise<FacebookIntakeItem>
  importFacebookPreviewsAsReports(
    items: FacebookPostPreview[],
    categoryId: string,
    actor: AdminActorRef,
  ): Promise<FacebookImportCommentsResult>
  getFacebookConnection(): Promise<FacebookConnectionRecord | null>
  saveFacebookConnection(
    input: FacebookConnectionRecord,
    actor: AdminActorRef,
  ): Promise<{ page_id: string; page_name: string }>
  deleteFacebookConnection(): Promise<void>
  createFacebookOauthSession(adminUserId: string, state: string, expiresAt: string): Promise<FacebookOauthSessionRecord>
  getFacebookOauthSession(state: string, adminUserId: string): Promise<FacebookOauthSessionRecord | null>
  saveFacebookOauthPages(sessionId: string, pages: FacebookOauthPage[]): Promise<FacebookOauthSessionRecord>
  getFacebookOauthSessionById(id: string, adminUserId: string): Promise<FacebookOauthSessionRecord | null>
  deleteFacebookOauthSession(id: string): Promise<void>
}
