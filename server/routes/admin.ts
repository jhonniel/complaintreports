import { Router } from 'express'
import type { Request } from 'express'
import {
  addNoteSchema,
  assignReportSchema,
  isUuid,
  parseAdminReportListQuery,
  updatePrioritySchema,
  updateStatusSchema,
} from '../../shared/adminReport.ts'
import {
  catalogCreateSchema,
  catalogUpdateSchema,
  parseCatalogCreate,
  parseCatalogUpdate,
} from '../../shared/catalog.ts'
import { parseAccessMapQuery, parseMapFilterQuery, toMapAccessCluster, toMapReportPoint } from '../../shared/map.ts'
import { isTicketNumber, normalizeTicketNumber } from '../../shared/report.ts'
import { parseAnalyticsQuery } from '../lib/analytics.ts'
import {
  DepartmentNotFoundError,
  ReportNotFoundError,
  StaffNotFoundError,
} from '../lib/adminReports.ts'
import {
  CatalogItemNotFoundError,
  DuplicateCatalogNameError,
  LastActiveCategoryError,
} from '../lib/catalog.ts'
import { sendError } from '../lib/http.ts'
import { logError } from '../lib/log.ts'
import { asyncHandler } from '../middleware/asyncHandler.ts'
import { getAdminActor, requireAdmin, requireRole } from '../middleware/auth.ts'
import { adminLimiter } from '../middleware/rateLimit.ts'
import { validateBody } from '../middleware/validate.ts'
import { getReportStore } from '../store/index.ts'

export const adminRouter = Router()

adminRouter.use(adminLimiter)
adminRouter.use(requireAdmin)

function queryRecord(query: Request['query']) {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(query)) {
    result[key] = Array.isArray(value) ? value[0] : value
  }
  return result
}

function actorFrom(res: Parameters<typeof getAdminActor>[0]) {
  const admin = getAdminActor(res)
  if (!admin) return null
  return {
    userId: admin.userId,
    fullName: admin.profile.fullName,
    role: admin.profile.role,
  }
}

function readTicketParam(req: Request) {
  const raw = req.params.ticketNumber
  const value = Array.isArray(raw) ? raw[0] ?? '' : raw ?? ''
  return normalizeTicketNumber(value)
}

function sendStoreError(res: Parameters<typeof sendError>[0], error: unknown) {
  if (error instanceof ReportNotFoundError || error instanceof CatalogItemNotFoundError) {
    sendError(res, 404, error.message)
    return true
  }
  if (error instanceof DuplicateCatalogNameError) {
    sendError(res, 409, error.message)
    return true
  }
  if (
    error instanceof DepartmentNotFoundError ||
    error instanceof StaffNotFoundError ||
    error instanceof LastActiveCategoryError
  ) {
    sendError(res, 400, error.message)
    return true
  }
  if (error instanceof Error && error.message === 'STORAGE_UNAVAILABLE') {
    sendError(
      res,
      503,
      'The database is not ready. Confirm the Supabase tables and SUPABASE_SERVICE_ROLE_KEY.',
    )
    return true
  }
  return false
}

function readIdParam(req: Request) {
  const raw = req.params.id
  const value = Array.isArray(raw) ? raw[0] ?? '' : raw ?? ''
  return value
}

adminRouter.get('/me', (_req, res) => {
  const admin = getAdminActor(res)
  if (!admin) {
    sendError(res, 401, 'Authentication is required.')
    return
  }
  res.json({
    user_id: admin.userId,
    email: admin.email,
    full_name: admin.profile.fullName,
    role: admin.profile.role,
  })
})

adminRouter.get(
  '/reports',
  asyncHandler(async (req, res) => {
    try {
      const query = parseAdminReportListQuery(queryRecord(req.query))
      const result = await getReportStore().listAdminReports(query)
      res.json(result)
    } catch (error) {
      if (sendStoreError(res, error)) return
      logError('admin', error)
      sendError(res, 500, 'Something went wrong. Please try again.')
    }
  }),
)

adminRouter.get(
  '/reports/:ticketNumber',
  asyncHandler(async (req, res) => {
    const ticketNumber = readTicketParam(req)
    if (!isTicketNumber(ticketNumber)) {
      sendError(res, 400, 'Enter a valid ticket number.')
      return
    }
    try {
      const report = await getReportStore().getAdminReport(ticketNumber)
      if (!report) {
        sendError(res, 404, 'Report not found.')
        return
      }
      res.json(report)
    } catch (error) {
      if (sendStoreError(res, error)) return
      logError('admin', error)
      sendError(res, 500, 'Something went wrong. Please try again.')
    }
  }),
)

adminRouter.patch(
  '/reports/:ticketNumber/status',
  validateBody(updateStatusSchema),
  asyncHandler(async (req, res) => {
    const actor = actorFrom(res)
    if (!actor) {
      sendError(res, 401, 'Authentication is required.')
      return
    }
    const ticketNumber = readTicketParam(req)
    if (!isTicketNumber(ticketNumber)) {
      sendError(res, 400, 'Enter a valid ticket number.')
      return
    }
    try {
      const report = await getReportStore().updateReportStatus(ticketNumber, req.body, actor)
      res.json(report)
    } catch (error) {
      if (sendStoreError(res, error)) return
      logError('admin', error)
      sendError(res, 500, 'Unable to update status.')
    }
  }),
)

adminRouter.patch(
  '/reports/:ticketNumber/priority',
  validateBody(updatePrioritySchema),
  asyncHandler(async (req, res) => {
    const actor = actorFrom(res)
    if (!actor) {
      sendError(res, 401, 'Authentication is required.')
      return
    }
    const ticketNumber = readTicketParam(req)
    if (!isTicketNumber(ticketNumber)) {
      sendError(res, 400, 'Enter a valid ticket number.')
      return
    }
    try {
      const report = await getReportStore().updateReportPriority(ticketNumber, req.body, actor)
      res.json(report)
    } catch (error) {
      if (sendStoreError(res, error)) return
      logError('admin', error)
      sendError(res, 500, 'Unable to update priority.')
    }
  }),
)

adminRouter.patch(
  '/reports/:ticketNumber/assign',
  validateBody(assignReportSchema),
  asyncHandler(async (req, res) => {
    const actor = actorFrom(res)
    if (!actor) {
      sendError(res, 401, 'Authentication is required.')
      return
    }
    const ticketNumber = readTicketParam(req)
    if (!isTicketNumber(ticketNumber)) {
      sendError(res, 400, 'Enter a valid ticket number.')
      return
    }
    try {
      const report = await getReportStore().assignReport(ticketNumber, req.body, actor)
      res.json(report)
    } catch (error) {
      if (sendStoreError(res, error)) return
      logError('admin', error)
      sendError(res, 500, 'Unable to assign this report.')
    }
  }),
)

adminRouter.post(
  '/reports/:ticketNumber/notes',
  validateBody(addNoteSchema),
  asyncHandler(async (req, res) => {
    const actor = actorFrom(res)
    if (!actor) {
      sendError(res, 401, 'Authentication is required.')
      return
    }
    const ticketNumber = readTicketParam(req)
    if (!isTicketNumber(ticketNumber)) {
      sendError(res, 400, 'Enter a valid ticket number.')
      return
    }
    try {
      const report = await getReportStore().addReportNote(ticketNumber, req.body.note, actor)
      res.json(report)
    } catch (error) {
      if (sendStoreError(res, error)) return
      logError('admin', error)
      sendError(res, 500, 'Unable to add the note.')
    }
  }),
)

adminRouter.get(
  '/analytics',
  asyncHandler(async (req, res) => {
    try {
      const query = parseAnalyticsQuery({
        period: typeof req.query.period === 'string' ? req.query.period : undefined,
        range: typeof req.query.range === 'string' ? req.query.range : undefined,
      })
      const analytics = await getReportStore().getAnalytics(query)
      res.json(analytics)
    } catch (error) {
      if (sendStoreError(res, error)) return
      logError('admin', error)
      sendError(res, 500, 'Something went wrong. Please try again.')
    }
  }),
)

adminRouter.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    try {
      const categories = await getReportStore().listAdminCategories()
      res.json({ categories })
    } catch (error) {
      if (sendStoreError(res, error)) return
      logError('admin', error)
      sendError(res, 500, 'Something went wrong. Please try again.')
    }
  }),
)

adminRouter.post(
  '/categories',
  requireRole('admin', 'super_admin'),
  validateBody(catalogCreateSchema),
  asyncHandler(async (req, res) => {
    try {
      const category = await getReportStore().createCategory(parseCatalogCreate(req.body))
      res.status(201).json(category)
    } catch (error) {
      if (sendStoreError(res, error)) return
      logError('admin', error)
      sendError(res, 500, 'Unable to create the category.')
    }
  }),
)

adminRouter.patch(
  '/categories/:id',
  requireRole('admin', 'super_admin'),
  validateBody(catalogUpdateSchema),
  asyncHandler(async (req, res) => {
    const id = readIdParam(req)
    if (!isUuid(id)) {
      sendError(res, 400, 'Enter a valid category.')
      return
    }
    try {
      const category = await getReportStore().updateCategory(id, parseCatalogUpdate(req.body))
      res.json(category)
    } catch (error) {
      if (sendStoreError(res, error)) return
      logError('admin', error)
      sendError(res, 500, 'Unable to update the category.')
    }
  }),
)

adminRouter.get(
  '/departments',
  asyncHandler(async (_req, res) => {
    try {
      const departments = await getReportStore().listDepartments()
      res.json({ departments })
    } catch (error) {
      if (sendStoreError(res, error)) return
      logError('admin', error)
      sendError(res, 500, 'Something went wrong. Please try again.')
    }
  }),
)

adminRouter.post(
  '/departments',
  requireRole('admin', 'super_admin'),
  validateBody(catalogCreateSchema),
  asyncHandler(async (req, res) => {
    try {
      const department = await getReportStore().createDepartment(parseCatalogCreate(req.body))
      res.status(201).json(department)
    } catch (error) {
      if (sendStoreError(res, error)) return
      logError('admin', error)
      sendError(res, 500, 'Unable to create the department.')
    }
  }),
)

adminRouter.patch(
  '/departments/:id',
  requireRole('admin', 'super_admin'),
  validateBody(catalogUpdateSchema),
  asyncHandler(async (req, res) => {
    const id = readIdParam(req)
    if (!isUuid(id)) {
      sendError(res, 400, 'Enter a valid department.')
      return
    }
    try {
      const department = await getReportStore().updateDepartment(id, parseCatalogUpdate(req.body))
      res.json(department)
    } catch (error) {
      if (sendStoreError(res, error)) return
      logError('admin', error)
      sendError(res, 500, 'Unable to update the department.')
    }
  }),
)

adminRouter.get(
  '/staff',
  asyncHandler(async (_req, res) => {
    const actor = actorFrom(res)
    if (!actor) {
      sendError(res, 401, 'Authentication is required.')
      return
    }
    try {
      const staff = await getReportStore().listStaff()
      if (!staff.some((entry) => entry.user_id === actor.userId)) {
        staff.unshift({
          user_id: actor.userId,
          full_name: actor.fullName,
          role: actor.role,
        })
      }
      res.json({ staff })
    } catch (error) {
      if (sendStoreError(res, error)) return
      logError('admin', error)
      sendError(res, 500, 'Something went wrong. Please try again.')
    }
  }),
)

adminRouter.get(
  '/map/reports',
  asyncHandler(async (req, res) => {
    try {
      const query = parseMapFilterQuery(queryRecord(req.query))
      const reports = await getReportStore().listMapReports(query)
      res.json({ reports: reports.map(toMapReportPoint) })
    } catch (error) {
      if (sendStoreError(res, error)) return
      logError('admin', error)
      sendError(res, 500, 'Something went wrong. Please try again.')
    }
  }),
)

adminRouter.get(
  '/map/access',
  asyncHandler(async (req, res) => {
    try {
      const query = parseAccessMapQuery(queryRecord(req.query))
      const clusters = await getReportStore().listMapAccess(query)
      res.json({ clusters: clusters.map(toMapAccessCluster) })
    } catch (error) {
      if (sendStoreError(res, error)) return
      logError('admin', error)
      sendError(res, 500, 'Something went wrong. Please try again.')
    }
  }),
)
