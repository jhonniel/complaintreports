import type { AccessMapQuery, MapAccessCluster, MapFilterQuery, MapReportPoint } from '@shared/map'
import { api } from '@/services/api'

function asParams(query: MapFilterQuery | AccessMapQuery) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value) params.set(key, value)
  }
  return params.toString()
}

export function fetchMapReports(query: MapFilterQuery) {
  const qs = asParams(query)
  return api.get<{ reports: MapReportPoint[] }>(`/admin/map/reports${qs ? `?${qs}` : ''}`)
}

export function fetchMapAccess(query: AccessMapQuery) {
  const qs = asParams(query)
  return api.get<{ clusters: MapAccessCluster[] }>(`/admin/map/access${qs ? `?${qs}` : ''}`)
}
