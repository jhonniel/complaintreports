import type { NextFunction, Request, Response } from 'express'
import express from 'express'

const jsonParser = express.json({ limit: '64kb' })

function parseRawJson(raw: string) {
  if (!raw.trim()) return {}
  return JSON.parse(raw) as unknown
}

export function parseJsonBody(req: Request, res: Response, next: NextFunction) {
  const contentType = req.headers['content-type'] ?? ''
  if (contentType.startsWith('image/') || contentType === 'application/octet-stream') {
    next()
    return
  }

  try {
    const existing = req.body as unknown
    if (Buffer.isBuffer(existing)) {
      req.body = parseRawJson(existing.toString('utf8'))
      next()
      return
    }
    if (typeof existing === 'string') {
      req.body = parseRawJson(existing)
      next()
      return
    }
    if (existing && typeof existing === 'object' && !Array.isArray(existing) && Object.keys(existing).length > 0) {
      next()
      return
    }
  } catch {
    res.status(400).json({ error: 'Please check the information you submitted.' })
    return
  }

  jsonParser(req, res, next)
}
