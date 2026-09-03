import type { Request, Response } from 'express'
import { env, hasServiceRole, isProduction, isSpacesConfigured, isSupabaseConfigured } from '../config/env.ts'
import { ProductionStorageError } from '../lib/errors.ts'
import { getReportStore } from '../store/index.ts'

export function healthHandler(_req: Request, res: Response) {
  const base = {
    service: 'tingog-page',
    phase: 12,
    supabase: isSupabaseConfigured ? 'configured' : 'not_configured',
    serviceRole: hasServiceRole ? 'configured' : 'not_configured',
    spaces: isSpacesConfigured ? 'configured' : 'not_configured',
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
    res.json({
      ...base,
      status: 'ok',
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
}
