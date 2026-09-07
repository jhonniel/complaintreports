import type { AdminReportListQuery } from '../../shared/adminReport.ts'
import type { AccessMapQuery, MapAccessCluster, MapFilterQuery } from '../../shared/map.ts'
import { roundAccessCell } from '../../shared/map.ts'
import { manilaDateKey } from './adminReports.ts'

export interface AccessLogRow {
  latitude: number | null
  longitude: number | null
  createdAt: string
  ipAddress?: string | null
}

export function mapFilterAsListQuery(filter: MapFilterQuery): AdminReportListQuery {
  return {
    q: '',
    status: filter.status,
    category_id: filter.category_id,
    priority: filter.priority,
    department_id: filter.department_id,
    date_from: filter.date_from,
    date_to: filter.date_to,
    sort: 'updated_at',
    order: 'desc',
    page: 1,
    page_size: 10,
  }
}

export function aggregateAccessLogs(rows: AccessLogRow[], query: AccessMapQuery): MapAccessCluster[] {
  const counts = new Map<string, MapAccessCluster>()
  for (const row of rows) {
    if (query.date_from && manilaDateKey(row.createdAt) < query.date_from) continue
    if (query.date_to && manilaDateKey(row.createdAt) > query.date_to) continue
    const latitude = row.latitude
    const longitude = row.longitude
    if (typeof latitude !== 'number' || typeof longitude !== 'number') continue
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue
    const cellLat = roundAccessCell(latitude)
    const cellLng = roundAccessCell(longitude)
    const key = `${cellLat},${cellLng}`
    const current = counts.get(key)
    if (current) {
      current.count += 1
      if (row.ipAddress) current.ip_address = row.ipAddress
    } else {
      counts.set(key, { latitude: cellLat, longitude: cellLng, count: 1, ip_address: row.ipAddress ?? null })
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count)
}
