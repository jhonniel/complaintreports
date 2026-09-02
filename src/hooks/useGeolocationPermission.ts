import { useCallback, useState } from 'react'

const STORAGE_KEY = 'tingog_geo_decision'

export type GeoDecision = 'granted' | 'denied' | 'dismissed' | 'unsupported'

export interface GeoPosition {
  latitude: number
  longitude: number
  accuracy: number | null
  timestamp: string
}

function readDecision(): GeoDecision | null {
  if (typeof window === 'undefined') return null
  if (!('geolocation' in navigator)) return 'unsupported'
  const value = sessionStorage.getItem(STORAGE_KEY)
  if (value === 'granted' || value === 'denied' || value === 'dismissed' || value === 'unsupported') {
    return value
  }
  return null
}

function persistDecision(decision: GeoDecision) {
  sessionStorage.setItem(STORAGE_KEY, decision)
}

export function useGeolocationPermission() {
  const [decision, setDecision] = useState<GeoDecision | null>(() => readDecision())
  const [position, setPosition] = useState<GeoPosition | null>(null)
  const [busy, setBusy] = useState(false)

  const remember = useCallback((next: GeoDecision) => {
    persistDecision(next)
    setDecision(next)
  }, [])

  const requestPosition = useCallback(async () => {
    if (!('geolocation' in navigator)) {
      remember('unsupported')
      return 'unsupported' as const
    }

    setBusy(true)
    return new Promise<GeoDecision>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (result) => {
          setPosition({
            latitude: result.coords.latitude,
            longitude: result.coords.longitude,
            accuracy: Number.isFinite(result.coords.accuracy) ? result.coords.accuracy : null,
            timestamp: new Date(result.timestamp).toISOString(),
          })
          remember('granted')
          setBusy(false)
          resolve('granted')
        },
        (error) => {
          const next = error.code === error.PERMISSION_DENIED ? 'denied' : 'dismissed'
          remember(next)
          setBusy(false)
          resolve(next)
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 60_000 },
      )
    })
  }, [remember])

  const dismiss = useCallback(() => {
    remember('dismissed')
  }, [remember])

  return {
    decision,
    position,
    busy,
    needsPrompt: decision === null,
    requestPosition,
    dismiss,
  }
}
