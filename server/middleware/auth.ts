import type { NextFunction, Request, Response } from 'express'
import { isAdminRole, type AdminRole } from '../../shared/auth.ts'
import { sendError } from '../lib/http.ts'
import { logError } from '../lib/log.ts'
import { getSupabaseAdminClient, getUserScopedClient } from '../lib/supabase.ts'

export interface AdminActor {
  userId: string
  email: string | null
  profile: {
    id: string
    fullName: string
    role: AdminRole
  }
}

function readAccessToken(req: Request) {
  const header = req.get('authorization') ?? ''
  const [scheme, token] = header.split(' ')
  if (!scheme || !token || scheme.toLowerCase() !== 'bearer') return null
  return token
}

export function getAdminActor(res: Response) {
  return res.locals.admin as AdminActor | undefined
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  void authorize(req, res, next)
}

export function requireRole(...roles: AdminRole[]) {
  return (_req: Request, res: Response, next: NextFunction) => {
    const admin = getAdminActor(res)
    if (!admin || !roles.includes(admin.profile.role)) {
      sendError(res, 403, 'You do not have access.')
      return
    }
    next()
  }
}

async function authorize(req: Request, res: Response, next: NextFunction) {
  const token = readAccessToken(req)
  if (!token) {
    sendError(res, 401, 'Authentication is required.')
    return
  }

  const scoped = getUserScopedClient(token)
  const adminClient = getSupabaseAdminClient()
  const authClient = adminClient ?? scoped
  if (!authClient) {
    sendError(res, 401, 'Authentication is required.')
    return
  }

  try {
    const { data, error } = await authClient.auth.getUser(token)
    if (error || !data.user) {
      sendError(res, 401, 'Authentication is required.')
      return
    }

    const profileClient = adminClient ?? scoped
    if (!profileClient) {
      sendError(res, 401, 'Authentication is required.')
      return
    }

    const { data: profile, error: profileError } = await profileClient
      .from('profiles')
      .select('id, full_name, role')
      .eq('user_id', data.user.id)
      .maybeSingle()

    if (profileError) {
      logError('auth', profileError)
      sendError(res, 401, 'Authentication is required.')
      return
    }

    const role = typeof profile?.role === 'string' ? profile.role : ''
    if (!profile || !isAdminRole(role)) {
      sendError(res, 403, 'You do not have access.')
      return
    }

    const actor: AdminActor = {
      userId: data.user.id,
      email: data.user.email ?? null,
      profile: {
        id: profile.id as string,
        fullName: profile.full_name as string,
        role,
      },
    }
    res.locals.admin = actor
    next()
  } catch (error) {
    logError('auth', error)
    sendError(res, 401, 'Authentication is required.')
  }
}
