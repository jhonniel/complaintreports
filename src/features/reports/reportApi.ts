import type { CreateReportResponse, PublicCategory, PublicTrackView } from '@shared/report'
import type { SitePlace } from '@shared/siteAddress'
import { ApiError, api } from '@/services/api'

export function fetchCategories() {
  return api.get<{ categories: PublicCategory[] }>('/categories')
}

export function reverseGeocode(latitude: number, longitude: number) {
  return api.post<SitePlace>('/geocode/reverse', { latitude, longitude })
}

export async function suggestSitePlaces(query: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ q: query })
  const response = await api.get<{ suggestions: SitePlace[] }>(`/geocode/suggest?${params.toString()}`, { signal })
  return response.suggestions
}

export function submitReport(payload: unknown) {
  return api.post<CreateReportResponse>('/reports', payload)
}

export function uploadReportPhoto(blob: Blob) {
  return api.postBlob<{ key: string; content_type: string; byte_size: number }>(
    '/uploads',
    blob,
    blob.type || 'image/jpeg',
  )
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
