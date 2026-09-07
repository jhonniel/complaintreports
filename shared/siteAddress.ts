export const KIDAPAWAN_CITY = 'Kidapawan City'
export const KIDAPAWAN_PROVINCE = 'Cotabato'
export const KIDAPAWAN_POSTAL_CODE = '9400'

export interface SitePlace {
  id: string
  address: string
  street: string
  barangay: string
  city: string
  province: string
  postal_code: string
  latitude: number
  longitude: number
  hint?: string
}

export function formatSiteAddress(parts: {
  street?: string | null
  barangay?: string | null
  city?: string | null
  province?: string | null
  postal_code?: string | null
}) {
  const street = (parts.street ?? '').trim()
  const barangay = (parts.barangay ?? '').trim()
  const city = (parts.city ?? '').trim() || KIDAPAWAN_CITY
  const province = (parts.province ?? '').trim() || KIDAPAWAN_PROVINCE
  const postal = (parts.postal_code ?? '').trim() || KIDAPAWAN_POSTAL_CODE
  return [street, barangay, city, province, postal].filter((part) => part.length > 0).join(', ')
}

export function formatSiteCoordinates(latitude: number, longitude: number) {
  return `Latitude ${latitude.toFixed(6)} · Longitude ${longitude.toFixed(6)}`
}

export function googleMapsNavigateUrl(latitude: number, longitude: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
}

export function toSitePlace(place: SitePlace): SitePlace {
  return {
    id: place.id,
    address: place.address,
    street: place.street,
    barangay: place.barangay,
    city: place.city,
    province: place.province,
    postal_code: place.postal_code,
    latitude: place.latitude,
    longitude: place.longitude,
    ...(place.hint ? { hint: place.hint } : {}),
  }
}
