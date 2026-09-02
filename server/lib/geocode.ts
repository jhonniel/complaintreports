import { KIDAPAWAN_CENTER } from '../../shared/map.ts'
import { env } from '../config/env.ts'
import { logError } from './log.ts'

const MAX_DISTANCE_DEGREES = 0.45

function isNearKidapawan(latitude: number, longitude: number) {
  const [centerLng, centerLat] = KIDAPAWAN_CENTER
  const dLat = latitude - centerLat
  const dLng = longitude - centerLng
  return dLat * dLat + dLng * dLng <= MAX_DISTANCE_DEGREES * MAX_DISTANCE_DEGREES
}

export async function geocodeKidapawanAddress(
  address: string,
): Promise<{ latitude: number; longitude: number } | null> {
  const key = env.tomtomApiKey
  const query = address.trim()
  if (!key || query.length < 4) return null

  const search = `${query}, Kidapawan City, Cotabato, Philippines`
  try {
    const url = new URL(`https://api.tomtom.com/search/2/geocode/${encodeURIComponent(search)}.json`)
    url.searchParams.set('key', key)
    url.searchParams.set('limit', '1')
    url.searchParams.set('countrySet', 'PH')
    url.searchParams.set('lat', String(KIDAPAWAN_CENTER[1]))
    url.searchParams.set('lon', String(KIDAPAWAN_CENTER[0]))
    url.searchParams.set('radius', '40000')

    const response = await fetch(url, { signal: AbortSignal.timeout(4000) })
    if (!response.ok) {
      logError('geocode', { message: `status ${response.status}` })
      return null
    }

    const body = (await response.json()) as {
      results?: { position?: { lat?: number; lon?: number } }[]
    }
    const position = body.results?.[0]?.position
    if (typeof position?.lat !== 'number' || typeof position?.lon !== 'number') return null
    if (!isNearKidapawan(position.lat, position.lon)) return null
    return { latitude: position.lat, longitude: position.lon }
  } catch (error) {
    logError('geocode', error)
    return null
  }
}
