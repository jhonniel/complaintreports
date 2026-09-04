import { createHmac, timingSafeEqual } from 'node:crypto'
import type { AdminRole } from '../../shared/auth.ts'
import { env, isDevAdminEnabled } from '../config/env.ts'

const PREFIX = 'dev'
const TTL_MS = 12 * 60 * 60 * 1000

export interface DevAdminActor {
  userId: string
  email: string | null
  profile: {
    id: string
    fullName: string
    role: AdminRole
    departmentId: string | null
  }
}

function digest(value: string) {
  return createHmac('sha256', 'tingog-compare').update(value).digest()
}

function secret() {
  return `${env.devAdminPassword}::tingog-dev-admin`
}

export function passwordsMatch(left: string, right: string) {
  return timingSafeEqual(digest(left), digest(right))
}

export function createDevSession(email: string, password: string) {
  if (!isDevAdminEnabled || !env.devAdminEmail || !env.devAdminPassword) return null
  if (!passwordsMatch(email.trim().toLowerCase(), env.devAdminEmail.toLowerCase())) return null
  if (!passwordsMatch(password, env.devAdminPassword)) return null

  const actor: DevAdminActor = {
    userId: '00000000-0000-0000-0000-000000000001',
    email: env.devAdminEmail,
    profile: {
      id: '00000000-0000-0000-0000-000000000002',
      fullName: 'City Administrator',
      role: 'super_admin',
      departmentId: null,
    },
  }
  const exp = Date.now() + TTL_MS
  const payload = Buffer.from(JSON.stringify({ actor, exp })).toString('base64url')
  const signature = createHmac('sha256', secret()).update(payload).digest('base64url')
  return { token: `${PREFIX}.${payload}.${signature}`, actor }
}

export function verifyDevToken(token: string): DevAdminActor | null {
  if (!isDevAdminEnabled) return null
  const [prefix, payload, signature] = token.split('.')
  if (prefix !== PREFIX || !payload || !signature) return null
  const expected = createHmac('sha256', secret()).update(payload).digest('base64url')
  if (!passwordsMatch(signature, expected)) return null
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString()) as {
      actor?: DevAdminActor
      exp?: number
    }
    if (!parsed.actor || typeof parsed.exp !== 'number' || parsed.exp < Date.now()) return null
    if (parsed.actor.profile.role !== 'super_admin') return null
    return {
      ...parsed.actor,
      profile: {
        ...parsed.actor.profile,
        departmentId: parsed.actor.profile.departmentId ?? null,
      },
    }
  } catch {
    return null
  }
}
