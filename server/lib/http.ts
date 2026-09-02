import type { Response } from 'express'

export function sendError(res: Response, status: number, error: string, details?: unknown) {
  return res.status(status).json(details ? { error, details } : { error })
}

export function sendNotImplemented(res: Response, feature: string) {
  return sendError(
    res,
    501,
    `${feature} is not available yet.`,
    'This endpoint is reserved for a later development phase.',
  )
}
