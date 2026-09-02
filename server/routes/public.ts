import { Router } from 'express'
import { createAccessLogSchema, normalizeAccessPage } from '../../shared/map.ts'
import {
  createReportSchema,
  isTicketNumber,
  normalizeTicketNumber,
  toCreateReportResponse,
  toPublicCategory,
  toPublicTrackView,
  type CreateReportInput,
} from '../../shared/report.ts'
import { sendError } from '../lib/http.ts'
import { captchaAccepted } from '../lib/captcha.ts'
import { geocodeKidapawanAddress } from '../lib/geocode.ts'
import { logError } from '../lib/log.ts'
import { asyncHandler } from '../middleware/asyncHandler.ts'
import { publicReadLimiter, publicWriteLimiter } from '../middleware/rateLimit.ts'
import { validateBody } from '../middleware/validate.ts'
import { getReportStore } from '../store/index.ts'
import { CategoryNotFoundError } from '../store/localStore.ts'

export const publicRouter = Router()

publicRouter.get(
  '/categories',
  publicReadLimiter,
  asyncHandler(async (_req, res) => {
    try {
      const categories = await getReportStore().listPublicCategories()
      res.json({ categories: categories.map(toPublicCategory) })
    } catch (error) {
      logError('public.categories', error)
      sendError(res, 500, 'Something went wrong. Please try again.')
    }
  }),
)

publicRouter.post(
  '/reports',
  publicWriteLimiter,
  (req, res, next) => {
    const honeypot = [req.body?.tp_hp, req.body?.website]
      .map((value) => (typeof value === 'string' ? value.trim() : ''))
      .find((value) => value.length > 0)
    if (honeypot) {
      return sendError(res, 400, 'Unable to submit your report.')
    }
    next()
  },
  validateBody(createReportSchema),
  asyncHandler(async (req, res) => {
    let payload = req.body as CreateReportInput
    if (!captchaAccepted(payload.captcha_token)) {
      sendError(res, 400, 'Unable to submit your report.')
      return
    }
    if (!payload.location) {
      const geo = await geocodeKidapawanAddress(payload.address)
      if (geo) {
        payload = {
          ...payload,
          location: {
            latitude: geo.latitude,
            longitude: geo.longitude,
            accuracy: null,
            timestamp: new Date().toISOString(),
          },
        }
      }
    }
    try {
      const created = await getReportStore().createReport(payload)
      res.status(201).json(toCreateReportResponse(created))
    } catch (error) {
      if (error instanceof CategoryNotFoundError) {
        sendError(res, 400, error.message)
        return
      }
      logError('public.reports', error)
      if (error instanceof Error && error.message === 'STORAGE_UNAVAILABLE') {
        sendError(
          res,
          503,
          'The service is temporarily unavailable. Please try again in a moment.',
        )
        return
      }
      sendError(res, 500, 'Unable to submit your report.')
    }
  }),
)

publicRouter.get(
  '/reports/track/:ticketNumber',
  publicReadLimiter,
  asyncHandler(async (req, res) => {
    const rawTicket = req.params.ticketNumber
    const ticketNumber = normalizeTicketNumber(Array.isArray(rawTicket) ? rawTicket[0] ?? '' : rawTicket ?? '')
    if (!isTicketNumber(ticketNumber)) {
      sendError(res, 400, 'Enter a valid ticket number.')
      return
    }
    try {
      const report = await getReportStore().findPublicByTicket(ticketNumber)
      if (!report) {
        sendError(res, 404, 'Ticket number not found.')
        return
      }
      res.json(toPublicTrackView(report))
    } catch (error) {
      logError('public.track', error)
      sendError(res, 500, 'Something went wrong. Please try again.')
    }
  }),
)

publicRouter.post(
  '/access-logs',
  publicWriteLimiter,
  (req, res, next) => {
    const honeypot = typeof req.body?.website === 'string' ? req.body.website.trim() : ''
    if (honeypot.length > 0) {
      res.status(201).json({ ok: true })
      return
    }
    next()
  },
  validateBody(createAccessLogSchema),
  asyncHandler(async (req, res) => {
    const payload = req.body as {
      session_id: string
      latitude: number
      longitude: number
      accuracy?: number | null
      page?: string
    }
    const userAgent = (req.get('user-agent') ?? '').slice(0, 300) || null
    try {
      await getReportStore().createAccessLog({
        session_id: payload.session_id,
        latitude: payload.latitude,
        longitude: payload.longitude,
        accuracy: payload.accuracy ?? null,
        page: normalizeAccessPage(payload.page),
        user_agent: userAgent,
      })
      res.status(201).json({ ok: true })
    } catch (error) {
      logError('public.access', error)
      sendError(res, 500, 'Unable to record access location.')
    }
  }),
)
