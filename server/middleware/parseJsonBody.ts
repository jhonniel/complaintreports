import type { NextFunction, Request, Response } from 'express'
import express from 'express'

const jsonParser = express.json({ limit: '64kb' })

function parseRawJson(raw: string) {
  if (!raw.trim()) return {}
  return JSON.parse(raw) as unknown
}

export function parseJsonBody(req: Request, res: Response, next: NextFunction) {
  const existing = req.body as unknown
  if (existing && typeof existing === 'object' && !Buffer.isBuffer(existing) && !Array.isArray(existing)) {
    if (Object.keys(existing as object).length > 0) {
      next()
      return
    }
  }

  if (Buffer.isBuffer(existing)) {
    try {
      req.body = parseRawJson(existing.toString('utf8'))
    } catch {
      res.status(400).json({ error: 'Please check the information you submitted.' })
      return
    }
    next()
    return
  }

  if (typeof existing === 'string') {
    try {
      req.body = parseRawJson(existing)
    } catch {
      res.status(400).json({ error: 'Please check the information you submitted.' })
      return
    }
    next()
    return
  }

  if (req.readableEnded) {
    next()
    return
  }

  jsonParser(req, res, next)
}
