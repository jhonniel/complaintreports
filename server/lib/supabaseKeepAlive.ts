import { env } from '../config/env.ts'

export type KeepAliveResult = {
  ok: boolean
  configured: boolean
  status?: number
  ms?: number
  error?: string
}

const PING_TIMEOUT_MS = 20_000

export async function pingSupabaseKeepAlive(): Promise<KeepAliveResult> {
  const url = env.supabaseUrl?.replace(/\/$/, '')
  const key = env.supabaseAnonKey
  if (!url || !key) {
    return { ok: false, configured: false, error: 'not_configured' }
  }

  const started = Date.now()
  try {
    const response = await fetch(`${url}/rest/v1/report_categories?select=id&limit=1`, {
      method: 'GET',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
        Prefer: 'count=none',
      },
      signal: AbortSignal.timeout(PING_TIMEOUT_MS),
    })
    return {
      ok: response.ok,
      configured: true,
      status: response.status,
      ms: Date.now() - started,
    }
  } catch (error) {
    return {
      ok: false,
      configured: true,
      ms: Date.now() - started,
      error: error instanceof Error ? error.name : 'ping_failed',
    }
  }
}
