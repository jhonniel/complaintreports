import { Router } from 'express'
import type { Request } from 'express'
import {
  facebookCommentsQuerySchema,
  facebookConvertSchema,
  facebookImportSchema,
  facebookIntakeListQuerySchema,
  facebookLookupSchema,
} from '../../shared/facebookIntake.ts'
import { isUuid } from '../../shared/adminReport.ts'
import {
  FacebookApiError,
  FacebookNotConfiguredError,
  isFacebookConfigured,
  isFacebookPageConfigured,
  listFacebookComments,
  listFacebookPagePosts,
  lookupFacebookPost,
} from '../lib/facebook.ts'
import {
  DuplicateFacebookIntakeError,
  FacebookIntakeNotConvertibleError,
  FacebookIntakeNotFoundError,
} from '../lib/facebookIntake.ts'
import { sendError } from '../lib/http.ts'
import { logError } from '../lib/log.ts'
import { asyncHandler } from '../middleware/asyncHandler.ts'
import { getAdminActor } from '../middleware/auth.ts'
import { validateBody } from '../middleware/validate.ts'
import { CategoryNotFoundError } from '../store/localStore.ts'
import { getReportStore } from '../store/index.ts'

export const facebookAdminRouter = Router()

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

function sendFacebookError(res: Parameters<typeof sendError>[0], error: unknown) {
  if (error instanceof FacebookNotConfiguredError) {
    sendError(res, 503, error.message)
    return true
  }
  if (error instanceof FacebookApiError) {
    sendError(res, 400, error.message)
    return true
  }
  if (error instanceof FacebookIntakeNotFoundError) {
    sendError(res, 404, error.message)
    return true
  }
  if (error instanceof DuplicateFacebookIntakeError) {
    sendError(res, 409, error.message)
    return true
  }
  if (error instanceof FacebookIntakeNotConvertibleError || error instanceof CategoryNotFoundError) {
    sendError(res, 400, error.message)
    return true
  }
  if (error instanceof Error && error.message === 'STORAGE_UNAVAILABLE') {
    sendError(
      res,
      503,
      'The database is not ready. Run the Facebook intakes SQL in Supabase, then try again.',
    )
    return true
  }
  return false
}

function readIntakeId(req: Request) {
  const raw = req.params.id
  const value = Array.isArray(raw) ? raw[0] ?? '' : raw ?? ''
  return value
}

facebookAdminRouter.get('/status', (_req, res) => {
  res.json({
    configured: isFacebookConfigured(),
    page_configured: isFacebookPageConfigured(),
  })
})

facebookAdminRouter.post(
  '/lookup',
  validateBody(facebookLookupSchema),
  asyncHandler(async (req, res) => {
    try {
      const post = await lookupFacebookPost(req.body.url)
      res.json({ post })
    } catch (error) {
      if (sendFacebookError(res, error)) return
      logError('facebook', error)
      sendError(res, 500, 'Something went wrong. Please try again.')
    }
  }),
)

facebookAdminRouter.get(
  '/posts',
  asyncHandler(async (_req, res) => {
    try {
      const posts = await listFacebookPagePosts()
      res.json({ posts })
    } catch (error) {
      if (sendFacebookError(res, error)) return
      logError('facebook', error)
      sendError(res, 500, 'Something went wrong. Please try again.')
    }
  }),
)

facebookAdminRouter.get(
  '/comments',
  asyncHandler(async (req, res) => {
    const parsed = facebookCommentsQuerySchema.safeParse(queryRecord(req.query))
    if (!parsed.success) {
      sendError(res, 400, 'Choose a Facebook post first.')
      return
    }
    try {
      const comments = await listFacebookComments(parsed.data.post_id)
      res.json({ comments })
    } catch (error) {
      if (sendFacebookError(res, error)) return
      logError('facebook', error)
      sendError(res, 500, 'Something went wrong. Please try again.')
    }
  }),
)

facebookAdminRouter.get(
  '/intakes',
  asyncHandler(async (req, res) => {
    const parsed = facebookIntakeListQuerySchema.safeParse(queryRecord(req.query))
    if (!parsed.success) {
      sendError(res, 400, 'Choose a valid intake status.')
      return
    }
    try {
      const intakes = await getReportStore().listFacebookIntakes(parsed.data.status)
      res.json({ intakes })
    } catch (error) {
      if (sendFacebookError(res, error)) return
      logError('facebook', error)
      sendError(res, 500, 'Something went wrong. Please try again.')
    }
  }),
)

facebookAdminRouter.post(
  '/intakes',
  validateBody(facebookImportSchema),
  asyncHandler(async (req, res) => {
    const actor = actorFrom(res)
    if (!actor) {
      sendError(res, 401, 'Authentication is required.')
      return
    }
    try {
      const intake = await getReportStore().createFacebookIntake(req.body, actor)
      res.status(201).json({ intake })
    } catch (error) {
      if (sendFacebookError(res, error)) return
      logError('facebook', error)
      sendError(res, 500, 'Something went wrong. Please try again.')
    }
  }),
)

facebookAdminRouter.post(
  '/intakes/:id/convert',
  validateBody(facebookConvertSchema),
  asyncHandler(async (req, res) => {
    const actor = actorFrom(res)
    if (!actor) {
      sendError(res, 401, 'Authentication is required.')
      return
    }
    const id = readIntakeId(req)
    if (!isUuid(id)) {
      sendError(res, 404, 'Facebook intake not found.')
      return
    }
    try {
      const intake = await getReportStore().convertFacebookIntake(id, req.body, actor)
      res.json({ intake })
    } catch (error) {
      if (sendFacebookError(res, error)) return
      logError('facebook', error)
      sendError(res, 500, 'Something went wrong. Please try again.')
    }
  }),
)

facebookAdminRouter.post(
  '/intakes/:id/dismiss',
  asyncHandler(async (req, res) => {
    const actor = actorFrom(res)
    if (!actor) {
      sendError(res, 401, 'Authentication is required.')
      return
    }
    const id = readIntakeId(req)
    if (!isUuid(id)) {
      sendError(res, 404, 'Facebook intake not found.')
      return
    }
    try {
      const intake = await getReportStore().dismissFacebookIntake(id, actor)
      res.json({ intake })
    } catch (error) {
      if (sendFacebookError(res, error)) return
      logError('facebook', error)
      sendError(res, 500, 'Something went wrong. Please try again.')
    }
  }),
)
