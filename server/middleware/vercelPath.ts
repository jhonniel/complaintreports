import type { NextFunction, Request, Response } from 'express'
import { env } from '../config/env.ts'

function splitUrl(url: string) {
  const queryIndex = url.indexOf('?')
  return {
    path: (queryIndex >= 0 ? url.slice(0, queryIndex) : url) || '/',
    query: queryIndex >= 0 ? url.slice(queryIndex + 1) : '',
  }
}

function withApiPrefix(path: string) {
  if (path === '/api' || path.startsWith('/api/')) return path
  if (!path || path === '/') return '/api'
  return path.startsWith('/') ? `/api${path}` : `/api/${path}`
}

function mergeQuery(...parts: string[]) {
  const params = new URLSearchParams()
  for (const part of parts) {
    if (!part) continue
    const extra = new URLSearchParams(part.startsWith('?') ? part.slice(1) : part)
    for (const [key, value] of extra) {
      if (key === '__path') continue
      if (!params.has(key)) params.set(key, value)
    }
  }
  return params
}

function headerPath(req: Request) {
  const keys = ['x-forwarded-uri', 'x-invoke-path', 'x-vercel-original-path'] as const
  for (const key of keys) {
    const value = req.get(key)
    if (value && value.startsWith('/')) return value
  }
  return ''
}

export function restoreVercelApiPath(req: Request, _res: Response, next: NextFunction) {
  if (!env.isVercel) {
    next()
    return
  }

  const current = splitUrl(req.url ?? '/')
  const forwarded = splitUrl(headerPath(req) || current.path)
  const incoming = new URLSearchParams(current.query)
  const rewritten = incoming.get('__path')
  incoming.delete('__path')

  const pathOnly = withApiPrefix((rewritten ?? (forwarded.path.startsWith('/api') ? forwarded.path : current.path)).split('?')[0])
  const params = mergeQuery(incoming.toString(), forwarded.query)
  const qs = params.toString()
  req.url = qs ? `${pathOnly}?${qs}` : pathOnly

  try {
    const query = req.query as Record<string, unknown>
    for (const [key, value] of params) query[key] = value
    delete query.__path
  } catch {
    /* Some hosts freeze req.query; routing still uses req.url. */
  }

  next()
}
