import {
  parseFacebookTarget,
  type FacebookPostPreview,
} from '../../shared/facebookIntake.ts'
import { env } from '../config/env.ts'

const GRAPH_BASE = 'https://graph.facebook.com/v21.0'
const POST_FIELDS = 'id,message,story,created_time,permalink_url,from{name}'
const COMMENT_FIELDS = 'id,message,created_time,permalink_url,from{name}'

export class FacebookApiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FacebookApiError'
  }
}

export class FacebookNotConfiguredError extends Error {
  constructor() {
    super('Facebook is not connected. Add FACEBOOK_ACCESS_TOKEN on the server.')
    this.name = 'FacebookNotConfiguredError'
  }
}

export function isFacebookConfigured() {
  return Boolean(env.facebookAccessToken)
}

export function isFacebookPageConfigured() {
  return Boolean(env.facebookAccessToken && env.facebookPageId)
}

function requireToken() {
  if (!env.facebookAccessToken) throw new FacebookNotConfiguredError()
  return env.facebookAccessToken
}

interface GraphPost {
  id?: string
  message?: string
  story?: string
  created_time?: string
  permalink_url?: string
  from?: { name?: string }
}

async function graphGet<T>(path: string, params: Record<string, string> = {}) {
  const token = requireToken()
  const url = new URL(path ? `${GRAPH_BASE}/${path.replace(/^\//, '')}` : GRAPH_BASE)
  url.searchParams.set('access_token', token)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)

  let response: Response
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(8000) })
  } catch {
    throw new FacebookApiError('Facebook did not respond. Try again, or paste the post text.')
  }

  const body = (await response.json()) as T & { error?: { message?: string } }
  if (!response.ok || body.error) {
    throw new FacebookApiError(
      body.error?.message ||
        'Facebook could not return that post. Use a Page the city manages, or paste the text.',
    )
  }
  return body
}

function toPreview(
  post: GraphPost,
  kind: FacebookPostPreview['kind'],
  postId: string,
  commentId: string | null = null,
): FacebookPostPreview | null {
  const id = typeof post.id === 'string' ? post.id : ''
  const message = (post.message || post.story || '').trim()
  if (!id || message.length < 8) return null
  return {
    facebook_post_id: postId || id,
    facebook_comment_id: commentId,
    permalink: post.permalink_url || `https://www.facebook.com/${id}`,
    author_name: post.from?.name?.trim() || 'Facebook user',
    message: message.slice(0, 5000),
    posted_at: post.created_time ?? null,
    kind,
  }
}

export async function lookupFacebookPost(urlOrId: string): Promise<FacebookPostPreview> {
  const target = parseFacebookTarget(urlOrId)
  if (!target) {
    throw new FacebookApiError('Paste a Facebook post link or post ID.')
  }
  const post =
    target.kind === 'id'
      ? await graphGet<GraphPost>(target.value, { fields: POST_FIELDS })
      : await graphGet<GraphPost>('', { id: target.value, fields: POST_FIELDS })
  const preview = toPreview(post, 'post', typeof post.id === 'string' ? post.id : '')
  if (!preview) throw new FacebookApiError('That Facebook post has no text to import.')
  return preview
}

export async function listFacebookPagePosts(): Promise<FacebookPostPreview[]> {
  const pageId = env.facebookPageId
  if (!pageId) {
    throw new FacebookApiError('Set FACEBOOK_PAGE_ID to load recent posts from the city Page.')
  }
  const body = await graphGet<{ data?: GraphPost[] }>(`${pageId}/posts`, {
    fields: POST_FIELDS,
    limit: '20',
  })
  return (body.data ?? [])
    .map((post) => toPreview(post, 'post', typeof post.id === 'string' ? post.id : ''))
    .filter((item): item is FacebookPostPreview => Boolean(item))
}

export async function listFacebookComments(postId: string): Promise<FacebookPostPreview[]> {
  const id = postId.trim()
  if (!id) throw new FacebookApiError('Choose a Facebook post first.')
  const body = await graphGet<{ data?: GraphPost[] }>(`${id}/comments`, {
    fields: COMMENT_FIELDS,
    limit: '50',
    order: 'reverse_chronological',
  })
  return (body.data ?? [])
    .map((comment) => {
      const commentId = typeof comment.id === 'string' ? comment.id : null
      if (!commentId) return null
      return toPreview(comment, 'comment', id, commentId)
    })
    .filter((item): item is FacebookPostPreview => Boolean(item))
}
