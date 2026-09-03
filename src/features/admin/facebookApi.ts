import type {
  FacebookConnectionStatus,
  FacebookConvertInput,
  FacebookImportInput,
  FacebookIntakeItem,
  FacebookIntakeStatus,
  FacebookPostPreview,
} from '@shared/facebookIntake'
import { api } from '@/services/api'

export function fetchFacebookStatus() {
  return api.get<FacebookConnectionStatus>('/admin/facebook/status')
}

export function lookupFacebookPost(url: string) {
  return api.post<{ post: FacebookPostPreview }>('/admin/facebook/lookup', { url })
}

export function fetchFacebookPagePosts() {
  return api.get<{ posts: FacebookPostPreview[] }>('/admin/facebook/posts')
}

export function fetchFacebookComments(postId: string) {
  return api.get<{ comments: FacebookPostPreview[] }>(
    `/admin/facebook/comments?post_id=${encodeURIComponent(postId)}`,
  )
}

export function fetchFacebookIntakes(status?: FacebookIntakeStatus | 'all') {
  const query = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : ''
  return api.get<{ intakes: FacebookIntakeItem[] }>(`/admin/facebook/intakes${query}`)
}

export function importFacebookIntake(input: FacebookImportInput) {
  return api.post<{ intake: FacebookIntakeItem }>('/admin/facebook/intakes', input)
}

export function convertFacebookIntake(id: string, input: FacebookConvertInput) {
  return api.post<{ intake: FacebookIntakeItem }>(`/admin/facebook/intakes/${encodeURIComponent(id)}/convert`, input)
}

export function dismissFacebookIntake(id: string) {
  return api.post<{ intake: FacebookIntakeItem }>(`/admin/facebook/intakes/${encodeURIComponent(id)}/dismiss`)
}
