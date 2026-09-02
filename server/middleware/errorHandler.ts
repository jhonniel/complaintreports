import type { NextFunction, Request, Response } from 'express'
import { ProductionStorageError } from '../lib/errors.ts'
import { sendError } from '../lib/http.ts'
import { logError } from '../lib/log.ts'

export function notFound(_req: Request, res: Response) {
  sendError(res, 404, 'The requested resource was not found.')
}

function errorType(err: unknown) {
  return err && typeof err === 'object' && 'type' in err ? (err as { type?: string }).type : undefined
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ProductionStorageError) {
    logError('storage', err)
    sendError(res, 503, err.message)
    return
  }
  if (errorType(err) === 'entity.parse.failed') {
    sendError(res, 400, 'Please check the information you submitted.')
    return
  }
  if (errorType(err) === 'entity.too.large') {
    sendError(res, 413, 'The request is too large.')
    return
  }
  logError('http', err)
  sendError(res, 500, 'Something went wrong. Please try again.')
}
