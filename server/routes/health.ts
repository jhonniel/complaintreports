import type { Request, Response } from 'express'
import { env, hasServiceRole, isProduction, isSpacesConfigured, isSupabaseConfigured } from '../config/env.ts'
import { ProductionStorageError } from '../lib/errors.ts'
import { pingSupabaseKeepAlive } from '../lib/supabaseKeepAlive.ts'
import { asyncHandler } from '../middleware/asyncHandler.ts'
import { getReportStore } from '../store/index.ts'

export const healthHandler = asyncHandler(async (_req: Request, res: Response) => {
  const database = await pingSupabaseKeepAlive()
  const base = {
    service: 'tingog-page',
    phase: 12,
    supabase: isSupabaseConfigured ? 'configured' : 'not_configured',
    serviceRole: hasServiceRole ? 'configured' : 'not_configured',
    spaces: isSpacesConfigured ? 'configured' : 'not_configured',
    database: database.ok ? 'ok' : database.configured ? 'unreachable' : 'not_configured',
    databaseMs: database.ms,
    timestamp: new Date().toISOString(),
    environment: env.nodeEnv,
  }

  if (isProduction && !hasServiceRole) {
    res.status(503).json({
      ...base,
      status: 'degraded',
      storage: 'unavailable',
    })
    return
  }

  try {
    res.status(database.ok || !database.configured ? 200 : 503).json({
      ...base,
      status: database.ok || !database.configured ? 'ok' : 'degraded',
      storage: getReportStore().mode,
    })
  } catch (error) {
    if (error instanceof ProductionStorageError) {
      res.status(503).json({
        ...base,
        status: 'degraded',
        storage: 'unavailable',
      })
      return
    }
    throw error
  }
})
