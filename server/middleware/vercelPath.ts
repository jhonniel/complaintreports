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

function headerPath(req: Request) {
  const keys = ['x-forwarded-uri', 'x-invoke-path', 'x-vercel-original-path'] as const
  for (const key of keys) {
    const value = req.get(key)
    if (value && value.startsWith('/')) return value
  }
  return null
}

function pathFromQuery(req: Request) {
  const raw = req.url ?? '/'
  const queryIndex = raw.indexOf('?')
  if (queryIndex < 0) return null
  const params = new URLSearchParams(raw.slice(queryIndex + 1))
  const encoded = params.get('__path')
  if (!encoded) return null
  params.delete('__path')
  const qs = params.toString()
  return qs ? `${encoded}?${qs}` : encoded
}

export function restoreVercelApiPath(req: Request, _res: Response, next: NextFunction) {
  if (!env.isVercel) {
    next()
    return
  }
  const candidate = pathFromQuery(req) ?? headerPath(req) ?? req.url ?? '/'
  req.url = withApiPrefix(candidate)
  next()
}
