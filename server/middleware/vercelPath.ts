import type { NextFunction, Request, Response } from 'express'
import { env } from '../config/env.ts'

function withApiPrefix(url: string) {
  const queryIndex = url.indexOf('?')
  const pathOnly = queryIndex >= 0 ? url.slice(0, queryIndex) : url
  const query = queryIndex >= 0 ? url.slice(queryIndex) : ''
  if (pathOnly === '/api' || pathOnly.startsWith('/api/')) return url
  const suffix = !pathOnly || pathOnly === '/' ? '' : pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`
  return `/api${suffix}${query}`
}

export function restoreVercelApiPath(req: Request, _res: Response, next: NextFunction) {
  if (!env.isVercel) {
    next()
    return
  }
  req.url = withApiPrefix(req.url ?? '/')
  next()
}
