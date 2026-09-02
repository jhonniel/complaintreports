import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env, hasServiceRole, isSupabaseConfigured } from '../config/env.ts'

let serviceClient: SupabaseClient | null = null
let anonClient: SupabaseClient | null = null

export function getSupabaseAnonClient() {
  if (!isSupabaseConfigured || !env.supabaseUrl || !env.supabaseAnonKey) return null
  if (!anonClient) {
    anonClient = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return anonClient
}

export function getSupabaseAdminClient() {
  if (!hasServiceRole || !env.supabaseUrl || !env.supabaseServiceRoleKey) return null
  if (!serviceClient) {
    serviceClient = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return serviceClient
}

export function getUserScopedClient(accessToken: string) {
  if (!env.supabaseUrl || !env.supabaseAnonKey) return null
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
