import type {
  FacebookConnectionStatus,
  FacebookConvertInput,
  FacebookImportCommentsResult,
  FacebookImportInput,
  FacebookIntakeItem,
  FacebookIntakeStatus,
  FacebookPostPreview,
} from '@shared/facebookIntake'
import { api } from '@/services/api'

export function fetchFacebookStatus() {
  return api.get<FacebookConnectionStatus>('/admin/facebook/status')
}

export function startFacebookOAuth() {
  return api.post<{ url: string; redirect_uri: string }>('/admin/facebook/oauth/start', {
    origin: window.location.origin,
  })
}

export function completeFacebookOAuth(code: string, state: string) {
  return api.post<{
    connected: boolean
    session_id: string | null
    page: { page_id: string; page_name: string } | null
    pages: { id: string; name: string }[]
  }>('/admin/facebook/oauth/complete', {
    code,
    state,
    origin: window.location.origin,
  })
}

export function selectFacebookPage(sessionId: string, pageId: string) {
  return api.post<{ page: { page_id: string; page_name: string } }>('/admin/facebook/oauth/select', {
    session_id: sessionId,
    page_id: pageId,
  })
}

export function disconnectFacebook() {
  return api.post<{ ok: true }>('/admin/facebook/disconnect')
}

export function lookupFacebookPost(url: string) {
  return api.post<{ post: FacebookPostPreview; comments: FacebookPostPreview[] }>('/admin/facebook/lookup', { url })
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

export function importFacebookComments(input: {
  url?: string
  post_id?: string
  category_id?: string
  include_post?: boolean
}) {
  return api.post<FacebookImportCommentsResult & { post: FacebookPostPreview }>('/admin/facebook/import-comments', input)
}

export function convertFacebookIntake(id: string, input: FacebookConvertInput) {
  return api.post<{ intake: FacebookIntakeItem }>(`/admin/facebook/intakes/${encodeURIComponent(id)}/convert`, input)
}

export function dismissFacebookIntake(id: string) {
  return api.post<{ intake: FacebookIntakeItem }>(`/admin/facebook/intakes/${encodeURIComponent(id)}/dismiss`)
}
