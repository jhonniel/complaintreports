import type { AnalyticsPeriod, AnalyticsRange, AnalyticsResponse } from '@shared/analytics'
import { api } from '@/services/api'

export function fetchAnalytics(period: AnalyticsPeriod, range: AnalyticsRange) {
  const params = new URLSearchParams({ period, range })
  return api.get<AnalyticsResponse>(`/admin/analytics?${params.toString()}`)
}
