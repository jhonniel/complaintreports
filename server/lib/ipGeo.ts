import type { Request } from 'express'

export interface IpGeoPoint {
  latitude: number
  longitude: number
  accuracy: number
}

const cache = new Map<string, { point: IpGeoPoint | null; expiresAt: number }>()
const CACHE_MS = 6 * 60 * 60 * 1000
const MAX_CACHE = 2000

export function isPrivateIp(ip: string) {
  if (ip === '::1' || ip === 'localhost') return true
  if (ip.startsWith('fe80:') || ip.toLowerCase().startsWith('fc') || ip.toLowerCase().startsWith('fd')) return true
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return false
  const [a, b] = parts
  return a === 10 || a === 127 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31) || (a === 169 && b === 254)
}

export function clientIp(req: Request): string | null {
  const forwarded = req.headers['x-forwarded-for']
  const candidate =
    (typeof forwarded === 'string' ? forwarded.split(',')[0] : Array.isArray(forwarded) ? forwarded[0] : undefined) ??
    req.headers['cf-connecting-ip'] ??
    req.headers['x-real-ip'] ??
    req.ip ??
    req.socket.remoteAddress
  const raw = Array.isArray(candidate) ? candidate[0] : candidate
  if (!raw) return null
  let ip = raw.trim().replace(/^\[|\]$/g, '')
  if (ip.startsWith('::ffff:')) ip = ip.slice(7)
  if (/^\d+\.\d+\.\d+\.\d+:\d+$/.test(ip)) ip = ip.slice(0, ip.lastIndexOf(':'))
  if (!ip) return null
  return ip.slice(0, 45)
}

function remember(key: string, point: IpGeoPoint | null) {
  if (cache.size >= MAX_CACHE) {
    const first = cache.keys().next().value
    if (first) cache.delete(first)
  }
  cache.set(key, { point, expiresAt: Date.now() + CACHE_MS })
}

function readPoint(body: Record<string, unknown>): IpGeoPoint | null {
  const latitude = Number(body.latitude ?? body.lat)
  const longitude = Number(body.longitude ?? body.lon ?? body.lng)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  if (latitude === 0 && longitude === 0) return null
  return { latitude, longitude, accuracy: 25000 }
}

async function fetchPoint(url: string): Promise<IpGeoPoint | null> {
  const response = await fetch(url, { signal: AbortSignal.timeout(3500) })
  if (!response.ok) return null
  const body = (await response.json()) as Record<string, unknown>
  if (body.success === false || body.error) return null
  return readPoint(body)
}

async function lookupProviders(ip: string): Promise<IpGeoPoint | null> {
  const cached = cache.get(ip)
  if (cached && cached.expiresAt > Date.now()) return cached.point
  try {
    const point =
      (await fetchPoint(`https://ipwho.is/${encodeURIComponent(ip)}`)) ??
      (await fetchPoint(`https://ipapi.co/${encodeURIComponent(ip)}/json/`))
    remember(ip, point)
    return point
  } catch {
    remember(ip, null)
    return null
  }
}

async function lookupSelf(): Promise<IpGeoPoint | null> {
  const cached = cache.get('self')
  if (cached && cached.expiresAt > Date.now()) return cached.point
  try {
    const point = (await fetchPoint('https://ipwho.is/')) ?? (await fetchPoint('https://ipapi.co/json/'))
    remember('self', point)
    return point
  } catch {
    remember('self', null)
    return null
  }
}

export async function geolocateRequest(
  req: Request,
  fallback: { latitude?: number; longitude?: number } | null,
): Promise<IpGeoPoint | null> {
  const ip = clientIp(req)
  if (ip && !isPrivateIp(ip)) {
    const point = await lookupProviders(ip)
    if (point) return point
  }
  if (
    fallback &&
    Number.isFinite(fallback.latitude) &&
    Number.isFinite(fallback.longitude) &&
    !(fallback.latitude === 0 && fallback.longitude === 0)
  ) {
    return { latitude: fallback.latitude as number, longitude: fallback.longitude as number, accuracy: 25000 }
  }
  if (!ip || isPrivateIp(ip)) return lookupSelf()
  return null
}
