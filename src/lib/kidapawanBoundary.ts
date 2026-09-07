import cityBoundary from '@/data/kidapawan-city.json'

type LngLat = [number, number]

function isLngLat(value: unknown): value is LngLat {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1])
  )
}

function readCityRing(data: unknown): LngLat[] {
  const collection = data as {
    features?: Array<{ geometry?: { coordinates?: unknown } }>
  }
  const coordinates = collection.features?.[0]?.geometry?.coordinates
  if (!Array.isArray(coordinates) || !Array.isArray(coordinates[0])) return []
  return (coordinates[0] as unknown[]).filter(isLngLat)
}

function ringBbox(ring: LngLat[]): [LngLat, LngLat] | null {
  if (ring.length < 4) return null
  let minLng = Infinity
  let minLat = Infinity
  let maxLng = -Infinity
  let maxLat = -Infinity
  for (const [lng, lat] of ring) {
    if (lng < minLng) minLng = lng
    if (lat < minLat) minLat = lat
    if (lng > maxLng) maxLng = lng
    if (lat > maxLat) maxLat = lat
  }
  if (![minLng, minLat, maxLng, maxLat].every(Number.isFinite)) return null
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ]
}

const cityRing = readCityRing(cityBoundary)
const bbox = ringBbox(cityRing)
const PAD = 0.08

/** Southwest / northeast corners used to keep the map on Kidapawan City. */
export const KIDAPAWAN_MAX_BOUNDS: [LngLat, LngLat] | null = bbox
  ? [
      [bbox[0][0] - PAD, bbox[0][1] - PAD],
      [bbox[1][0] + PAD, bbox[1][1] + PAD],
    ]
  : null

export const KIDAPAWAN_FIT_BOUNDS: [LngLat, LngLat] | null = bbox

export const kidapawanCityCollection = {
  type: 'FeatureCollection' as const,
  features:
    cityRing.length >= 4
      ? [
          {
            type: 'Feature' as const,
            properties: { name: 'Kidapawan City' },
            geometry: { type: 'Polygon' as const, coordinates: [cityRing] },
          },
        ]
      : [],
}
