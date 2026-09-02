import { rateLimit } from 'express-rate-limit'

const tooMany = { error: 'Too many requests. Please try again later.' }

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
  ...shared,
})

export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  ...shared,
})
