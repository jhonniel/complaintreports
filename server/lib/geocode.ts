import { KIDAPAWAN_CENTER } from '../../shared/map.ts'
import {
  formatSiteAddress,
  KIDAPAWAN_CITY,
  KIDAPAWAN_POSTAL_CODE,
  KIDAPAWAN_PROVINCE,
  toSitePlace,
  type SitePlace,
} from '../../shared/siteAddress.ts'
import { env } from '../config/env.ts'
import { logError } from './log.ts'

const MAX_DISTANCE_DEGREES = 0.45
const SUGGEST_LIMIT = 6

interface TomtomAddress {
  streetNumber?: string
  streetName?: string
  municipalitySubdivision?: string
  neighbourhood?: string
  municipality?: string
  localName?: string
  countrySecondarySubdivision?: string
  countrySubdivision?: string
  countrySubdivisionName?: string
  postalCode?: string
  freeformAddress?: string
}

function fallbackPlace(latitude: number, longitude: number, id = 'gps'): SitePlace {
  return toSitePlace({
    id,
    street: '',
    barangay: '',
    city: KIDAPAWAN_CITY,
    province: KIDAPAWAN_PROVINCE,
    postal_code: KIDAPAWAN_POSTAL_CODE,
    latitude,
    longitude,
    address: formatSiteAddress({}),
  })
}

function mentionsKidapawan(address: TomtomAddress) {
  return /kidapawan/i.test(
    [address.municipality, address.localName, address.freeformAddress].filter(Boolean).join(' '),
  )
}

function streetFrom(address: TomtomAddress, poiName?: string) {
  const street = [address.streetNumber, address.streetName].filter(Boolean).join(' ').trim()
  if (street) return street
  return poiName?.trim() ?? ''
}

function barangayFrom(address: TomtomAddress) {
  return (address.municipalitySubdivision || address.neighbourhood || '').trim()
}

function provinceFrom(address: TomtomAddress) {
  const candidates = [
    address.countrySecondarySubdivision,
    address.countrySubdivisionName,
    address.countrySubdivision,
  ]
  for (const candidate of candidates) {
    const raw = candidate?.trim() ?? ''
    if (/cotabato/i.test(raw)) return /north/i.test(raw) ? 'North Cotabato' : 'Cotabato'
  }
  return KIDAPAWAN_PROVINCE
}

function postalFrom(address: TomtomAddress) {
  const zip = (address.postalCode || '').trim()
  return /^\d{4}$/.test(zip) ? zip : KIDAPAWAN_POSTAL_CODE
}

function placeFromTomtom(
  address: TomtomAddress,
  latitude: number,
  longitude: number,
  extra?: { id?: string; poiName?: string },
): SitePlace {
  const street = streetFrom(address, extra?.poiName)
  const barangay = barangayFrom(address)
  const city = KIDAPAWAN_CITY
  const province = provinceFrom(address)
  const postal_code = postalFrom(address)
  const poiName = extra?.poiName?.trim() ?? ''
  return toSitePlace({
    id: extra?.id || `${latitude.toFixed(6)},${longitude.toFixed(6)}`,
    street,
    barangay,
    city,
    province,
    postal_code,
    latitude,
    longitude,
    address: formatSiteAddress({ street, barangay, city, province, postal_code }),
    ...(poiName && poiName !== street ? { hint: poiName } : {}),
  })
}

export function isNearKidapawan(latitude: number, longitude: number) {
  const [centerLng, centerLat] = KIDAPAWAN_CENTER
  const dLat = latitude - centerLat
  const dLng = longitude - centerLng
  return dLat * dLat + dLng * dLng <= MAX_DISTANCE_DEGREES * MAX_DISTANCE_DEGREES
}

export async function reverseGeocodeKidapawan(
  latitude: number,
  longitude: number,
): Promise<SitePlace | null> {
  if (!isNearKidapawan(latitude, longitude)) return null
  const key = env.tomtomApiKey
  if (!key) return fallbackPlace(latitude, longitude)

  try {
    const url = new URL(`https://api.tomtom.com/search/2/reverseGeocode/${latitude},${longitude}.json`)
    url.searchParams.set('key', key)
    url.searchParams.set('radius', '500')
    const response = await fetch(url, { signal: AbortSignal.timeout(4000) })
    if (!response.ok) {
      logError('reverse-geocode', { message: `status ${response.status}` })
      return fallbackPlace(latitude, longitude)
    }
    const body = (await response.json()) as { addresses?: { address?: TomtomAddress }[] }
    const address = body.addresses?.[0]?.address
    if (!address) return fallbackPlace(latitude, longitude)
    return placeFromTomtom(address, latitude, longitude, { id: 'gps' })
  } catch (error) {
    logError('reverse-geocode', error)
    return fallbackPlace(latitude, longitude)
  }
}

export async function suggestKidapawanPlaces(query: string): Promise<SitePlace[]> {
  const key = env.tomtomApiKey
  const q = query.trim()
  if (!key || q.length < 2) return []
  const search = /kidapawan/i.test(q) ? q : `${q}, Kidapawan City`

  try {
    const url = new URL(`https://api.tomtom.com/search/2/search/${encodeURIComponent(search)}.json`)
    url.searchParams.set('key', key)
    url.searchParams.set('typeahead', 'true')
    url.searchParams.set('limit', '10')
    url.searchParams.set('countrySet', 'PH')
    url.searchParams.set('lat', String(KIDAPAWAN_CENTER[1]))
    url.searchParams.set('lon', String(KIDAPAWAN_CENTER[0]))
    url.searchParams.set('radius', '35000')
    url.searchParams.set('idxSet', 'PAD,Str,Geo,POI,Xstr')
    url.searchParams.set('language', 'en-GB')

    const response = await fetch(url, { signal: AbortSignal.timeout(4000) })
    if (!response.ok) {
      logError('geocode-suggest', { message: `status ${response.status}` })
      return []
    }

    const body = (await response.json()) as {
      results?: {
        id?: string
        address?: TomtomAddress
        position?: { lat?: number; lon?: number }
        poi?: { name?: string }
      }[]
    }

    const seen = new Set<string>()
    const suggestions: SitePlace[] = []
    for (const result of body.results ?? []) {
      const lat = result.position?.lat
      const lon = result.position?.lon
      if (typeof lat !== 'number' || typeof lon !== 'number') continue
      if (!isNearKidapawan(lat, lon)) continue
      if (!result.address || !mentionsKidapawan(result.address)) continue
      const place = placeFromTomtom(result.address, lat, lon, {
        id: result.id,
        poiName: result.poi?.name,
      })
      if (!place.street && !place.barangay) continue
      if (seen.has(place.address)) continue
      seen.add(place.address)
      suggestions.push(place)
      if (suggestions.length >= SUGGEST_LIMIT) break
    }
    return suggestions
  } catch (error) {
    logError('geocode-suggest', error)
    return []
  }
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

export async function resolveSiteLocation(address: string) {
  const geo = await geocodeKidapawanAddress(address)
  if (!geo) return null
  return {
    latitude: geo.latitude,
    longitude: geo.longitude,
    accuracy: null as number | null,
    timestamp: new Date().toISOString(),
  }
}

export async function resolveReportLocation(
  address: string,
  gps?: { latitude: number; longitude: number } | null,
) {
  if (gps && isNearKidapawan(gps.latitude, gps.longitude)) {
    return {
      latitude: gps.latitude,
      longitude: gps.longitude,
      accuracy: null as number | null,
      timestamp: new Date().toISOString(),
    }
  }
  return resolveSiteLocation(address)
}

export function reportNeedsSiteGeocode(report: {
  address?: string | null
  latitude: number | null
  longitude: number | null
  location_accuracy?: number | null
}) {
  if (!report.address || report.address.trim().length < 4) return false
  if (report.latitude == null || report.longitude == null) return true
  return report.location_accuracy != null
}
