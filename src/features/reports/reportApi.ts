import type { CreateReportResponse, PublicCategory, PublicTrackView } from '@shared/report'
import { api } from '@/services/api'

export function fetchCategories() {
  return api.get<{ categories: PublicCategory[] }>('/categories')
}

export function submitReport(payload: unknown) {
  return api.post<CreateReportResponse>('/reports', payload)
}

export function trackReport(ticketNumber: string) {
  const params = new URLSearchParams({ ticket: ticketNumber })
  return api.get<PublicTrackView>(`/track?${params.toString()}`)
}
