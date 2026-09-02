import { api } from '@/services/api'

const SESSION_KEY = 'tingog_session_id'
const LOGGED_KEY = 'tingog_access_logged'

function sessionId() {
  let value = sessionStorage.getItem(SESSION_KEY)
  if (!value) {
    value = crypto.randomUUID()
    sessionStorage.setItem(SESSION_KEY, value)
  }
  return value
}

export function logAccessLocation(input: {
  latitude: number
  longitude: number
  accuracy: number | null
  page: string
}) {
  if (sessionStorage.getItem(LOGGED_KEY) === '1') return Promise.resolve()
  sessionStorage.setItem(LOGGED_KEY, '1')
  return api
    .post('/access-logs', {
      session_id: sessionId(),
      latitude: input.latitude,
      longitude: input.longitude,
      accuracy: input.accuracy,
      page: input.page,
    })
    .catch(() => {
      sessionStorage.removeItem(LOGGED_KEY)
    })
}

export function logAccessFromBrowser(page: string) {
  if (!('geolocation' in navigator)) return
  if (sessionStorage.getItem(LOGGED_KEY) === '1') return
  navigator.geolocation.getCurrentPosition(
    (result) => {
      void logAccessLocation({
        latitude: result.coords.latitude,
        longitude: result.coords.longitude,
        accuracy: Number.isFinite(result.coords.accuracy) ? result.coords.accuracy : null,
        page,
      })
    },
    () => undefined,
    { enableHighAccuracy: false, timeout: 8000, maximumAge: 120_000 },
  )
}
