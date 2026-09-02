import type { CreateReportResponse, PublicCategory, PublicTrackView } from '@shared/report'
import { ApiError, api } from '@/services/api'

export function fetchCategories() {
  return api.get<{ categories: PublicCategory[] }>('/categories')
}

export function submitReport(payload: unknown) {
  return api.post<CreateReportResponse>('/reports', payload)
}

export async function trackReport(ticketNumber: string) {
  const params = new URLSearchParams({ ticket: ticketNumber })
  try {
    return await api.get<PublicTrackView>(`/track?${params.toString()}`)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404 && error.message !== 'Ticket number not found.') {
      return api.get<PublicTrackView>(`/reports/track/${encodeURIComponent(ticketNumber)}`)
    }
    throw error
  }
}
