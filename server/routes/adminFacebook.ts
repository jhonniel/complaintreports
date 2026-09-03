import { randomBytes } from 'node:crypto'
import { Router } from 'express'
import type { Request } from 'express'
import {
  facebookCommentsQuerySchema,
  facebookConvertSchema,
  facebookImportCommentsSchema,
  facebookImportSchema,
  facebookIntakeListQuerySchema,
  facebookLookupSchema,
  facebookOauthCompleteSchema,
  facebookOauthSelectSchema,
  facebookOauthStartSchema,
} from '../../shared/facebookIntake.ts'
import { DEFAULT_CATEGORIES } from '../../shared/categories.ts'
import { isUuid } from '../../shared/adminReport.ts'
import { env, isAllowedOrigin } from '../config/env.ts'
import {
  FacebookApiError,
  FacebookNotConfiguredError,
  facebookOAuthUrl,
  facebookRedirectUri,
  getFacebookCredentials,
  isFacebookOAuthReady,
  lookupFacebookPostWithComments,
  listFacebookComments,
  listFacebookPagePosts,
  listManagedFacebookPages,
  toPublicFacebookPages,
} from '../lib/facebook.ts'
import { FacebookOauthSessionError } from '../lib/facebookConnection.ts'
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
  if (error instanceof FacebookOauthSessionError) {
    sendError(res, 400, error.message)
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

function redirectOrigin(raw: string | undefined) {
  if (!raw) return env.publicSiteUrl
  try {
    const url = new URL(raw.includes('://') ? raw : `http://${raw}`)
    const origin = `${url.protocol}//${url.host}`
    if (isAllowedOrigin(origin) || origin === env.publicSiteUrl) return origin
  } catch {
    return env.publicSiteUrl
  }
  return env.publicSiteUrl
}

facebookAdminRouter.get(
  '/status',
  asyncHandler(async (_req, res) => {
    let stored = null as Awaited<ReturnType<typeof getFacebookCredentials>>
    try {
      stored = await getFacebookCredentials()
    } catch {
      stored = null
    }
    res.json({
      oauth_ready: isFacebookOAuthReady(),
      configured: Boolean(stored?.access_token),
      page_configured: Boolean(stored?.access_token && stored.page_id),
      page_id: stored?.page_id || null,
      page_name: stored?.page_name || null,
      source: stored?.source ?? null,
    })
  }),
)

facebookAdminRouter.post(
  '/oauth/start',
  validateBody(facebookOauthStartSchema),
  asyncHandler(async (req, res) => {
    const actor = actorFrom(res)
    if (!actor) {
      sendError(res, 401, 'Authentication is required.')
      return
    }
    if (!isFacebookOAuthReady()) {
      sendError(res, 503, 'Add FACEBOOK_APP_ID and FACEBOOK_APP_SECRET to connect a Page.')
      return
    }
    const origin = redirectOrigin(typeof req.body.origin === 'string' ? req.body.origin : undefined)
    const redirectUri = facebookRedirectUri(origin)
    const state = randomBytes(24).toString('hex')
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()
    try {
      await getReportStore().createFacebookOauthSession(actor.userId, state, expiresAt)
      res.json({ url: facebookOAuthUrl(redirectUri, state), redirect_uri: redirectUri })
    } catch (error) {
      if (sendFacebookError(res, error)) return
      logError('facebook', error)
      sendError(res, 500, 'Something went wrong. Please try again.')
    }
  }),
)

facebookAdminRouter.post(
  '/oauth/complete',
  validateBody(facebookOauthCompleteSchema),
  asyncHandler(async (req, res) => {
    const actor = actorFrom(res)
    if (!actor) {
      sendError(res, 401, 'Authentication is required.')
      return
    }
    const origin = redirectOrigin(typeof req.body.origin === 'string' ? req.body.origin : undefined)
    const redirectUri = facebookRedirectUri(origin)
    try {
      const session = await getReportStore().getFacebookOauthSession(req.body.state, actor.userId)
      if (!session) throw new FacebookOauthSessionError()
      const pages = session.pages ?? (await listManagedFacebookPages(req.body.code, redirectUri))
      if (!session.pages) {
        await getReportStore().saveFacebookOauthPages(session.id, pages)
      }
      if (pages.length === 0) {
        throw new FacebookApiError(
          'No Pages were returned. Use a Facebook account that manages the city Page.',
        )
      }
      const publicPages = toPublicFacebookPages(pages)
      if (pages.length === 1) {
        const connected = await getReportStore().saveFacebookConnection(
          {
            page_id: pages[0].id,
            page_name: pages[0].name,
            access_token: pages[0].access_token,
          },
          actor,
        )
        await getReportStore().deleteFacebookOauthSession(session.id)
        res.json({ connected: true, session_id: null, page: connected, pages: publicPages })
        return
      }
      res.json({ connected: false, session_id: session.id, page: null, pages: publicPages })
    } catch (error) {
      if (sendFacebookError(res, error)) return
      logError('facebook', error)
      sendError(res, 500, 'Something went wrong. Please try again.')
    }
  }),
)

facebookAdminRouter.post(
  '/oauth/select',
  validateBody(facebookOauthSelectSchema),
  asyncHandler(async (req, res) => {
    const actor = actorFrom(res)
    if (!actor) {
      sendError(res, 401, 'Authentication is required.')
      return
    }
    try {
      const session = await getReportStore().getFacebookOauthSessionById(req.body.session_id, actor.userId)
      if (!session?.pages) throw new FacebookOauthSessionError()
      const page = session.pages.find((entry) => entry.id === req.body.page_id)
      if (!page) {
        sendError(res, 400, 'Choose a Facebook Page from the list.')
        return
      }
      const connected = await getReportStore().saveFacebookConnection(
        {
          page_id: page.id,
          page_name: page.name,
          access_token: page.access_token,
        },
        actor,
      )
      await getReportStore().deleteFacebookOauthSession(session.id)
      res.json({ page: connected })
    } catch (error) {
      if (sendFacebookError(res, error)) return
      logError('facebook', error)
      sendError(res, 500, 'Something went wrong. Please try again.')
    }
  }),
)

facebookAdminRouter.post(
  '/disconnect',
  asyncHandler(async (_req, res) => {
    try {
      await getReportStore().deleteFacebookConnection()
      res.json({ ok: true })
    } catch (error) {
      if (sendFacebookError(res, error)) return
      logError('facebook', error)
      sendError(res, 500, 'Something went wrong. Please try again.')
    }
  }),
)

facebookAdminRouter.post(
  '/lookup',
  validateBody(facebookLookupSchema),
  asyncHandler(async (req, res) => {
    try {
      const result = await lookupFacebookPostWithComments(req.body.url)
      res.json(result)
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

facebookAdminRouter.post(
  '/import-comments',
  validateBody(facebookImportCommentsSchema),
  asyncHandler(async (req, res) => {
    const actor = actorFrom(res)
    if (!actor) {
      sendError(res, 401, 'Authentication is required.')
      return
    }
    const target = (req.body.url as string | undefined)?.trim() || (req.body.post_id as string | undefined)?.trim() || ''
    try {
      const { post, comments } = await lookupFacebookPostWithComments(target)
      const includePost = req.body.include_post !== false
      const items = includePost ? [post, ...comments] : comments
      if (items.length === 0) {
        sendError(res, 400, 'That Facebook post has no public comments to import.')
        return
      }
      const categories = await getReportStore().listAdminCategories()
      const active = categories.filter((category) => category.is_active)
      const requested = typeof req.body.category_id === 'string' ? req.body.category_id : ''
      const otherId = DEFAULT_CATEGORIES.find((category) => category.name === 'Other')?.id
      const categoryId =
        (requested && active.find((category) => category.id === requested)?.id) ||
        active.find((category) => category.id === otherId)?.id ||
        active[0]?.id
      if (!categoryId) {
        sendError(res, 400, 'Add an active category before importing Facebook comments.')
        return
      }
      const result = await getReportStore().importFacebookPreviewsAsReports(items, categoryId, actor)
      res.json({
        post,
        ...result,
        comment_count: comments.length,
      })
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
