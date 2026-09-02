import { Router } from 'express'
import { z } from 'zod'
import { isDevAdminEnabled } from '../config/env.ts'
import { createDevSession } from '../lib/devAuth.ts'
import { sendError } from '../lib/http.ts'
import { publicWriteLimiter } from '../middleware/rateLimit.ts'
import { validateBody } from '../middleware/validate.ts'

const sessionSchema = z.object({
  email: z.string().trim().min(3).max(160),
  password: z.string().min(1).max(200),
})

export const devRouter = Router()

devRouter.post(
  '/session',
  publicWriteLimiter,
  validateBody(sessionSchema),
  (req, res) => {
    if (!isDevAdminEnabled) {
      sendError(res, 404, 'The requested resource was not found.')
      return
    }
    const body = req.body as { email: string; password: string }
    const session = createDevSession(body.email, body.password)
    if (!session) {
      sendError(res, 401, 'Invalid email or password.')
      return
    }
    res.json({
      access_token: session.token,
      user_id: session.actor.userId,
      email: session.actor.email,
      full_name: session.actor.profile.fullName,
      role: session.actor.profile.role,
      profile_id: session.actor.profile.id,
    })
  },
)
