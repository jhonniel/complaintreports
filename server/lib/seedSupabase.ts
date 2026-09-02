import { DEFAULT_CATEGORIES } from '../../shared/categories.ts'
import { DEFAULT_DEPARTMENTS } from '../../shared/departments.ts'
import { env, hasServiceRole } from '../config/env.ts'
import { logError } from './log.ts'
import { getSupabaseAdminClient } from './supabase.ts'

const SEED_ADMIN_NAME = 'City Administrator'
const SEED_ADMIN_ROLE = 'super_admin' as const

let seedPromise: Promise<void> | null = null

export function ensureSupabaseSeed() {
  if (seedPromise) return seedPromise
  seedPromise = runSeed().catch((error) => {
    seedPromise = null
    logError('seed', error)
  })
  return seedPromise
}

async function runSeed() {
  if (!hasServiceRole || !env.devAdminEmail || !env.devAdminPassword) return
  const db = getSupabaseAdminClient()
  if (!db) return

  const email = env.devAdminEmail.trim().toLowerCase()
  const user = await ensureAuthUser(db, email, env.devAdminPassword)
  if (!user) return

  const profile = await db.from('profiles').upsert(
    {
      user_id: user.id,
      full_name: SEED_ADMIN_NAME,
      role: SEED_ADMIN_ROLE,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )

  if (profile.error) {
    logError('seed.profile', profile.error)
    return
  }

  const categories = await db.from('report_categories').upsert(
    DEFAULT_CATEGORIES.map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description,
      is_active: true,
    })),
    { onConflict: 'id' },
  )
  if (categories.error) logError('seed.categories', categories.error)

  const departments = await db.from('departments').upsert(
    DEFAULT_DEPARTMENTS.map((department) => ({
      id: department.id,
      name: department.name,
      description: department.description,
      is_active: true,
    })),
    { onConflict: 'id' },
  )
  if (departments.error) logError('seed.departments', departments.error)

  console.log('[tingog:seed] administrator is in Supabase Auth and profiles')
}

async function ensureAuthUser(
  db: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  email: string,
  password: string,
) {
  const existing = await findAuthUser(db, email)
  if (existing) return existing

  const created = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: SEED_ADMIN_NAME },
  })

  if (created.data.user) return created.data.user
  if (created.error) {
    const again = await findAuthUser(db, email)
    if (again) return again
    logError('seed.auth', created.error)
  }
  return null
}

async function findAuthUser(db: NonNullable<ReturnType<typeof getSupabaseAdminClient>>, email: string) {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 })
    if (error) {
      logError('seed.auth', error)
      return null
    }
    const found = data.users.find((user) => user.email?.toLowerCase() === email)
    if (found) return found
    if (data.users.length < 200) return null
  }
  return null
}
