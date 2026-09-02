import type { AdminReportListQuery } from '../../shared/adminReport.ts'
import type { AccessMapQuery, MapAccessCluster, MapFilterQuery } from '../../shared/map.ts'
import { roundAccessCell } from '../../shared/map.ts'
import { manilaDateKey } from './adminReports.ts'

export interface AccessLogRow {
  latitude: number
  longitude: number
  createdAt: string
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
    if (!Number.isFinite(row.latitude) || !Number.isFinite(row.longitude)) continue
    const latitude = roundAccessCell(row.latitude)
    const longitude = roundAccessCell(row.longitude)
    const key = `${latitude},${longitude}`
    const current = counts.get(key)
    if (current) current.count += 1
    else counts.set(key, { latitude, longitude, count: 1 })
  }
  return [...counts.values()].sort((a, b) => b.count - a.count)
}
