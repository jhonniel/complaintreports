import { LOCATION_PROMPT_KEY } from '@/lib/constants'

export interface ReportLocation {
  latitude: number
  longitude: number
  accuracy: number | null
  timestamp: string
}

export type LocationCaptureStatus = 'idle' | 'asking' | 'captured' | 'denied' | 'unavailable'

export type StoredLocationPrompt =
  | { decision: 'captured'; location: ReportLocation }
  | { decision: 'skipped' }

export function canRequestLocation() {
  return typeof navigator !== 'undefined' && Boolean(navigator.geolocation)
}

export function readStoredLocationPrompt(): StoredLocationPrompt | null {
  if (typeof sessionStorage === 'undefined') return null
  try {
    const parsed = JSON.parse(sessionStorage.getItem(LOCATION_PROMPT_KEY) ?? '') as StoredLocationPrompt
    if (parsed.decision === 'captured' && Number.isFinite(parsed.location?.latitude) && Number.isFinite(parsed.location?.longitude)) {
      return parsed
    }
    if (parsed.decision === 'skipped') return parsed
    return null
  } catch {
    return null
  }
}

export function writeStoredLocationPrompt(value: StoredLocationPrompt) {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.setItem(LOCATION_PROMPT_KEY, JSON.stringify(value))
}

export function clearStoredLocationPrompt() {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.removeItem(LOCATION_PROMPT_KEY)
}

export async function queryGeolocationPermission(): Promise<'granted' | 'denied' | 'prompt' | 'unknown'> {
  if (!canRequestLocation()) return 'unknown'
  if (!navigator.permissions?.query) return 'unknown'
  try {
    const result = await navigator.permissions.query({ name: 'geolocation' })
    if (result.state === 'granted' || result.state === 'denied' || result.state === 'prompt') {
      return result.state
    }
    return 'unknown'
  } catch {
    return 'unknown'
  }
}

export function requestReportLocation(timeoutMs = 20000): Promise<
  { ok: true; location: ReportLocation } | { ok: false; status: Exclude<LocationCaptureStatus, 'idle' | 'asking' | 'captured'> }
> {
  if (!canRequestLocation()) {
    return Promise.resolve({ ok: false, status: 'unavailable' })
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude
        const longitude = position.coords.longitude
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          resolve({ ok: false, status: 'unavailable' })
          return
        }
        resolve({
          ok: true,
          location: {
            latitude,
            longitude,
            accuracy: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
            timestamp: new Date(position.timestamp || Date.now()).toISOString(),
          },
        })
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) resolve({ ok: false, status: 'denied' })
        else resolve({ ok: false, status: 'unavailable' })
      },
      {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 0,
      },
    )
  })
}
