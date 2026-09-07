import { api } from '@/services/api'
import { pingSupabaseKeepAlive } from '@/lib/keepAlive'

const SESSION_KEY = 'tingog_session_id'
const LOGGED_KEY = 'tingog_access_logged_v2'

function sessionId() {
  let value = sessionStorage.getItem(SESSION_KEY)
  if (!value) {
    value = crypto.randomUUID()
    sessionStorage.setItem(SESSION_KEY, value)
  }
  return value
}

async function lookupOwnPublicLocation() {
  try {
    const response = await fetch('https://ipwho.is/', { signal: AbortSignal.timeout(3500) })
    if (!response.ok) return null
    const body = (await response.json()) as {
      success?: boolean
      latitude?: number
      longitude?: number
      lat?: number
      lon?: number
    }
    if (body.success === false) return null
    const latitude = Number(body.latitude ?? body.lat)
    const longitude = Number(body.longitude ?? body.lon)
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
    if (latitude === 0 && longitude === 0) return null
    return { latitude, longitude }
  } catch {
    return null
  }
}

export async function logPublicAccess(page: string) {
  if (typeof sessionStorage === 'undefined') return
  if (sessionStorage.getItem(LOGGED_KEY) === '1') return
  sessionStorage.setItem(LOGGED_KEY, '1')
  const location = await lookupOwnPublicLocation()
  try {
    await api.post('/access-logs', {
      session_id: sessionId(),
      page,
      ...(location ?? {}),
    })
  } catch {
    sessionStorage.removeItem(LOGGED_KEY)
    pingSupabaseKeepAlive(true)
  }
}
