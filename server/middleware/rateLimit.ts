import type { Request } from 'express'
import { rateLimit } from 'express-rate-limit'
import { env } from '../config/env.ts'

const tooMany = { error: 'Too many requests. Please try again later.' }

function isKeepAliveRequest(req: Request) {
  if (req.get('user-agent') === 'vercel-cron/1.0') return true
  if (!env.cronSecret) return false
  return (req.get('authorization') ?? '') === `Bearer ${env.cronSecret}`
}

const shared = {
  standardHeaders: 'draft-8' as const,
  legacyHeaders: false,
  message: tooMany,
  validate: false as const,
}

export const publicWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  ...shared,
})

export const publicReadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 80,
  ...shared,
})

export const healthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  skip: isKeepAliveRequest,
  ...shared,
})

export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  ...shared,
})
