import type { Request, Response } from 'express'
import { env } from '../config/env.ts'
import { pingSupabaseKeepAlive } from '../lib/supabaseKeepAlive.ts'
import { asyncHandler } from '../middleware/asyncHandler.ts'

function isAuthorizedCron(req: Request) {
  if (!env.cronSecret) return true
  return (req.get('authorization') ?? '') === `Bearer ${env.cronSecret}`
}

export const keepAliveHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!isAuthorizedCron(req)) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const database = await pingSupabaseKeepAlive()
  const ok = database.ok || !database.configured
  res.status(ok ? 200 : 503).json({
    service: 'tingog-page',
    status: database.ok ? 'ok' : database.configured ? 'unreachable' : 'skipped',
    database,
    timestamp: new Date().toISOString(),
  })
})
