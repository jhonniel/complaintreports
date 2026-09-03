import { Router, type NextFunction, type Request, type Response } from 'express'
import express from 'express'
import { createAccessLogSchema, normalizeAccessPage } from '../../shared/map.ts'
import {
  REPORT_PHOTO_MAX_FILE_BYTES,
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
import { sendTicketEmailIfRequested } from '../lib/mail.ts'
import {
  detectImageContentType,
  isManagedPhotoKey,
  isSpacesConfigured,
  uploadReportPhoto,
} from '../lib/spaces.ts'
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
      if (error instanceof Error && error.message === 'STORAGE_UNAVAILABLE') {
        sendError(
          res,
          503,
          'The service is temporarily unavailable. Please try again in a moment.',
        )
        return
      }
      sendError(res, 500, 'Something went wrong. Please try again.')
    }
  }),
)

const photoRawParser = express.raw({
  type: ['image/jpeg', 'image/png', 'image/webp', 'application/octet-stream'],
  limit: REPORT_PHOTO_MAX_FILE_BYTES,
})

function photoBodyParser(req: Request, res: Response, next: NextFunction) {
  if (Buffer.isBuffer(req.body) && req.body.byteLength > 0) {
    next()
    return
  }
  photoRawParser(req, res, next)
}

publicRouter.post(
  '/uploads',
  publicWriteLimiter,
  photoBodyParser,
  asyncHandler(async (req, res) => {
    if (!isSpacesConfigured) {
      sendError(res, 503, 'Photo uploads are temporarily unavailable.')
      return
    }
    const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0)
    if (body.byteLength < 32) {
      sendError(res, 400, 'Choose a photo to upload.')
      return
    }
    if (body.byteLength > REPORT_PHOTO_MAX_FILE_BYTES) {
      sendError(res, 400, 'Each photo must be 4 MB or less after compression.')
      return
    }
    const detected = detectImageContentType(body)
    if (!detected) {
      sendError(res, 400, 'Use a JPEG, PNG, or WebP photo.')
      return
    }
    try {
      const uploaded = await uploadReportPhoto(body, detected)
      res.status(201).json(uploaded)
    } catch (error) {
      logError('public.uploads', error)
      sendError(res, 500, 'Unable to upload that photo. Please try again.')
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
    const photos = payload.photos ?? []
    if (photos.some((photo) => !isManagedPhotoKey(photo.key))) {
      sendError(res, 400, 'One of the photos could not be attached. Please upload them again.')
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
      await sendTicketEmailIfRequested({
        email: payload.email,
        ticketNumber: created.ticket_number,
      })
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

function firstString(value: unknown) {
  if (typeof value === 'string') return value
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
  return ''
}

function ticketFromUrl(url: string) {
  const queryIndex = url.indexOf('?')
  if (queryIndex < 0) return ''
  return new URLSearchParams(url.slice(queryIndex + 1)).get('ticket') ?? ''
}

function readTicketQuery(req: Request) {
  return (
    firstString(req.query.ticket) ||
    ticketFromUrl(req.url ?? '') ||
    ticketFromUrl(req.originalUrl ?? '')
  )
}

async function sendPublicTrack(res: Parameters<typeof sendError>[0], rawTicket: string) {
  const ticketNumber = normalizeTicketNumber(rawTicket)
  if (!ticketNumber) {
    sendError(res, 400, 'Enter your ticket number.')
    return
  }
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
    if (error instanceof Error && error.message === 'STORAGE_UNAVAILABLE') {
      sendError(res, 503, 'The service is temporarily unavailable. Please try again in a moment.')
      return
    }
    sendError(res, 500, 'Something went wrong. Please try again.')
  }
}

publicRouter.get(
  '/track',
  publicReadLimiter,
  asyncHandler(async (req, res) => {
    await sendPublicTrack(res, readTicketQuery(req))
  }),
)

publicRouter.get(
  '/reports/track/:ticketNumber',
  publicReadLimiter,
  asyncHandler(async (req, res) => {
    const rawTicket = req.params.ticketNumber
    await sendPublicTrack(res, Array.isArray(rawTicket) ? rawTicket[0] ?? '' : rawTicket ?? '')
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
