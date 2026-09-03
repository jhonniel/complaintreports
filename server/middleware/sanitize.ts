import type { NextFunction, Request, Response } from 'express'

function sanitizeString(value: string) {
  return value.replace(/\u0000/g, '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
}

function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string') return sanitizeString(value)
  if (Array.isArray(value)) return value.map(sanitizeValue)
  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {}
    for (const [key, nested] of Object.entries(value)) {
      output[key] = sanitizeValue(nested)
    }
    return output
  }
  return value
}

export function sanitizeBody(req: Request, _res: Response, next: NextFunction) {
  if (Buffer.isBuffer(req.body)) {
    next()
    return
  }
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body)
  }
  next()
}
