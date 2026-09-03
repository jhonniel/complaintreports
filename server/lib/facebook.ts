import {
  canonicalFacebookPermalink,
  isFacebookHost,
  isFacebookShareLink,
  parseFacebookTarget,
  type FacebookPageOption,
  type FacebookPostPreview,
} from '../../shared/facebookIntake.ts'
import { env } from '../config/env.ts'
import type { FacebookConnectionRecord, FacebookOauthPage } from './facebookConnection.ts'
import { getReportStore } from '../store/index.ts'

const GRAPH_BASE = 'https://graph.facebook.com/v21.0'
const OAUTH_DIALOG = 'https://www.facebook.com/v21.0/dialog/oauth'
const OAUTH_SCOPES = 'pages_show_list,pages_read_engagement,pages_read_user_content'
const POST_FIELDS = 'id,message,story,created_time,permalink_url,from{name},og_object{id}'
const PHOTO_FIELDS = 'id,name,created_time,link,from{name},page_story_id'
const COMMENT_FIELDS = 'id,message,created_time,permalink_url,from{name}'

export class FacebookApiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FacebookApiError'
  }
}

export class FacebookNotConfiguredError extends Error {
  constructor() {
    super('Connect a Facebook Page in Facebook intake, or add a Page access token on the server.')
    this.name = 'FacebookNotConfiguredError'
  }
}

export function isFacebookOAuthReady() {
  return Boolean(env.facebookAppId && env.facebookAppSecret)
}

export async function getFacebookCredentials(): Promise<FacebookConnectionRecord | null> {
  try {
    const stored = await getReportStore().getFacebookConnection()
    if (stored?.access_token && stored.page_id) return { ...stored, source: 'oauth' }
  } catch {
    // Connection table may not exist yet.
  }
  if (!env.facebookAccessToken) return null
  return {
    page_id: env.facebookPageId ?? '',
    page_name: env.facebookPageId ? 'Connected from server settings' : '',
    access_token: env.facebookAccessToken,
    source: 'env',
  }
}

export async function isFacebookConfigured() {
  return Boolean(await getFacebookCredentials())
}

export async function isFacebookPageConfigured() {
  const connection = await getFacebookCredentials()
  return Boolean(connection?.access_token && connection.page_id)
}

async function requireConnection() {
  const connection = await getFacebookCredentials()
  if (!connection?.access_token) throw new FacebookNotConfiguredError()
  return connection
}

interface GraphList<T> {
  data?: T[]
  paging?: { next?: string }
}

interface GraphPost {
  id?: string
  message?: string
  story?: string
  name?: string
  created_time?: string
  permalink_url?: string
  link?: string
  from?: { name?: string }
  og_object?: { id?: string }
  page_story_id?: string
  comments?: GraphList<GraphPost>
}

function graphObjectId(post: GraphPost, fallback = '') {
  const ogId = typeof post.og_object?.id === 'string' ? post.og_object.id : ''
  const id = typeof post.id === 'string' ? post.id : ''
  const storyId = typeof post.page_story_id === 'string' ? post.page_story_id : ''
  if (id && !id.startsWith('http')) return id
  if (storyId && !storyId.startsWith('http')) return storyId
  if (ogId && !ogId.startsWith('http')) return ogId
  return fallback
}

async function graphGet<T>(path: string, params: Record<string, string> = {}, accessToken?: string) {
  const token = accessToken ?? (await requireConnection()).access_token
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

async function graphGetUrl<T>(nextUrl: string) {
  let response: Response
  try {
    response = await fetch(nextUrl, { signal: AbortSignal.timeout(12000) })
  } catch {
    throw new FacebookApiError('Facebook did not finish returning comments. Try again.')
  }
  const body = (await response.json()) as T & { error?: { message?: string } }
  if (!response.ok || body.error) {
    throw new FacebookApiError(
      body.error?.message ||
        'Facebook could not return those comments. Use a Page the city manages, or paste the text.',
    )
  }
  return body
}

async function graphGetAll<T>(path: string, params: Record<string, string>, maxPages = 10): Promise<T[]> {
  const items: T[] = []
  let body = await graphGet<GraphList<T>>(path, params)
  items.push(...(body.data ?? []))
  for (let page = 1; page < maxPages && body.paging?.next; page++) {
    body = await graphGetUrl<GraphList<T>>(body.paging.next)
    items.push(...(body.data ?? []))
  }
  return items
}

function toPreview(
  post: GraphPost,
  kind: FacebookPostPreview['kind'],
  postId: string,
  commentId: string | null = null,
): FacebookPostPreview | null {
  const objectId = graphObjectId(post, postId)
  const message =
    (post.message || post.story || post.name || '').trim() ||
    (kind === 'post' ? '(No caption)' : kind === 'comment' ? 'Facebook comment' : '')
  if (!objectId || message.length < 1) return null
  return {
    facebook_post_id: kind === 'comment' ? postId : objectId,
    facebook_comment_id: commentId,
    permalink: post.permalink_url || post.link || `https://www.facebook.com/${commentId || objectId}`,
    author_name: post.from?.name?.trim() || 'Facebook user',
    message: message.slice(0, 5000),
    posted_at: post.created_time ?? null,
    kind,
  }
}

function flattenGraphComments(nodes: GraphPost[]): GraphPost[] {
  const items: GraphPost[] = []
  for (const node of nodes) {
    items.push(node)
    if (node.comments?.data?.length) items.push(...flattenGraphComments(node.comments.data))
  }
  return items
}

function previewsFromComments(nodes: GraphPost[], postId: string) {
  const seen = new Set<string>()
  const comments: FacebookPostPreview[] = []
  for (const node of flattenGraphComments(nodes)) {
    const commentId = typeof node.id === 'string' ? node.id : null
    if (!commentId || seen.has(commentId)) continue
    const preview = toPreview(node, 'comment', postId, commentId)
    if (!preview) continue
    seen.add(commentId)
    comments.push(preview)
  }
  return comments
}

async function fetchCommentsOnObject(objectId: string): Promise<GraphPost[]> {
  const fieldSets = [COMMENT_FIELDS, 'id,message,created_time,permalink_url,from{name}', 'id,message,created_time']
  const extras: Array<Record<string, string>> = [{}, { filter: 'stream' }, { order: 'chronological' }]
  for (const fields of fieldSets) {
    for (const extra of extras) {
      try {
        return await graphGetAll<GraphPost>(`${objectId}/comments`, {
          fields,
          limit: '100',
          ...extra,
        })
      } catch {
        continue
      }
    }
  }
  for (const fields of fieldSets) {
    try {
      const body = await graphGet<GraphPost>(objectId, {
        fields: `comments.limit(100){${fields},comments.limit(50){${fields}}}`,
      })
      return flattenGraphComments(body.comments?.data ?? [])
    } catch {
      continue
    }
  }
  return []
}

async function facebookRedirectLocation(url: string) {
  const headers = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  }
  for (const method of ['HEAD', 'GET'] as const) {
    try {
      const response = await fetch(url, {
        method,
        redirect: 'manual',
        headers,
        signal: AbortSignal.timeout(8000),
      })
      const location = response.headers.get('location')
      if (location) return location
    } catch {
      if (method === 'GET') return null
    }
  }
  return null
}

async function expandFacebookUrl(input: string) {
  let current = input.trim()
  if (!/^https?:\/\//i.test(current) || !isFacebookShareLink(current)) return current

  for (let hop = 0; hop < 5; hop++) {
    const location = await facebookRedirectLocation(current)
    if (!location) break
    let next: URL
    try {
      next = new URL(location, current)
    } catch {
      break
    }
    if (!isFacebookHost(next.hostname) && next.hostname !== 'fb.watch' && next.hostname !== 'www.fb.watch') break
    if (next.pathname.toLowerCase().includes('login')) break
    current = next.toString()
    if (parseFacebookTarget(current)?.kind === 'id') return canonicalFacebookPermalink(current)
  }
  return current
}

async function resolveFacebookObject(urlOrId: string) {
  const connection = await requireConnection()
  const original = urlOrId.trim()
  const expanded = await expandFacebookUrl(original)
  const target = parseFacebookTarget(expanded)
  if (!target) {
    throw new FacebookApiError('Paste a Facebook post link or post ID.')
  }

  if (target.page_id && connection.page_id && target.page_id !== connection.page_id) {
    throw new FacebookApiError(
      'That post is not from the connected Facebook Page. Connect the Page that published it, then try this link again.',
    )
  }

  const permalinks = new Set<string>()
  const permalink = target.url || (expanded.startsWith('http') ? expanded : original.startsWith('http') ? original : null)
  if (permalink) permalinks.add(canonicalFacebookPermalink(permalink))
  if (original.startsWith('http')) permalinks.add(original)
  if (target.page_id && target.kind === 'id') {
    const storyId = target.value.includes('_') ? target.value.split('_')[1] : target.value
    permalinks.add(`https://www.facebook.com/${target.page_id}/posts/${storyId}`)
    const permalinkUrl = new URL('https://www.facebook.com/permalink.php')
    permalinkUrl.searchParams.set('story_fbid', storyId)
    permalinkUrl.searchParams.set('id', target.page_id)
    permalinks.add(permalinkUrl.toString())
  }

  const candidates: Array<{ path: string; params: Record<string, string> }> = []
  const fieldSets = target.object === 'photo' ? [PHOTO_FIELDS, POST_FIELDS] : [POST_FIELDS, PHOTO_FIELDS]
  if (target.kind === 'id') {
    for (const fields of fieldSets) {
      candidates.push({ path: target.value, params: { fields } })
      if (connection.page_id && /^\d+$/.test(target.value) && !target.value.includes('_')) {
        candidates.push({ path: `${connection.page_id}_${target.value}`, params: { fields } })
      }
      if (target.page_id && target.value.startsWith('pfbid')) {
        candidates.push({ path: `${target.page_id}_${target.value}`, params: { fields } })
      }
    }
  }
  if (target.object === 'photo' && target.kind === 'id' && /^\d+$/.test(target.value)) {
    const photoUrl = new URL('https://www.facebook.com/photo.php')
    photoUrl.searchParams.set('fbid', target.value)
    permalinks.add(photoUrl.toString())
    permalinks.add(`https://www.facebook.com/photo/?fbid=${target.value}`)
  }
  for (const url of permalinks) {
    for (const fields of fieldSets) {
      candidates.push({ path: '', params: { id: url, fields } })
    }
  }

  let lastError: FacebookApiError | null = null
  for (const candidate of candidates) {
    try {
      const post = await graphGet<GraphPost>(candidate.path, candidate.params, connection.access_token)
      const preview = toPreview(post, 'post', graphObjectId(post))
      if (!preview) continue
      const commentIds = [
        preview.facebook_post_id,
        typeof post.id === 'string' ? post.id : '',
        typeof post.page_story_id === 'string' ? post.page_story_id : '',
        target.kind === 'id' ? target.value : '',
      ]
      if (connection.page_id && target.kind === 'id' && /^\d+$/.test(target.value) && !target.value.includes('_')) {
        commentIds.push(`${connection.page_id}_${target.value}`)
      }
      return {
        post: preview,
        graph: post,
        commentIds: [...new Set(commentIds.filter((id) => id && !id.startsWith('http')))],
      }
    } catch (error) {
      if (error instanceof FacebookApiError) lastError = error
    }
  }
  throw new FacebookApiError(
    lastError?.message ||
      (isFacebookShareLink(original)
        ? 'Facebook could not open that share link for the connected Page. Connect the Page that published the post, or use Load recent Page posts.'
        : 'Facebook could not open that photo or post. Connect the Page that published it, then try again.'),
  )
}

export async function lookupFacebookPost(urlOrId: string): Promise<FacebookPostPreview> {
  return (await resolveFacebookObject(urlOrId)).post
}

export async function lookupFacebookPostWithComments(urlOrId: string) {
  const resolved = await resolveFacebookObject(urlOrId)
  const nested = previewsFromComments(resolved.graph.comments?.data ?? [], resolved.post.facebook_post_id)
  const fetched = await listFacebookCommentsFromIds(resolved.commentIds, resolved.post.facebook_post_id)
  const seen = new Set(nested.map((item) => item.facebook_comment_id))
  const comments = [...nested]
  for (const item of fetched) {
    if (item.facebook_comment_id && seen.has(item.facebook_comment_id)) continue
    if (item.facebook_comment_id) seen.add(item.facebook_comment_id)
    comments.push(item)
  }
  return { post: resolved.post, comments }
}

export async function listFacebookPagePosts(): Promise<FacebookPostPreview[]> {
  const connection = await requireConnection()
  const pageId = connection.page_id
  if (!pageId) {
    throw new FacebookApiError('Pick a Facebook Page to load recent posts.')
  }
  const body = await graphGet<{ data?: GraphPost[] }>(
    `${pageId}/posts`,
    {
      fields: POST_FIELDS,
      limit: '20',
    },
    connection.access_token,
  )
  return (body.data ?? [])
    .map((post) => toPreview(post, 'post', graphObjectId(post)))
    .filter((item): item is FacebookPostPreview => Boolean(item))
}

async function listFacebookCommentsFromIds(ids: string[], postId?: string) {
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))]
  const parentId = postId || unique[0] || ''
  const comments: FacebookPostPreview[] = []
  const seen = new Set<string>()
  for (const id of unique) {
    const batch = await fetchCommentsOnObject(id)
    for (const preview of previewsFromComments(batch, parentId || id)) {
      const key = preview.facebook_comment_id
      if (!key || seen.has(key)) continue
      seen.add(key)
      comments.push(preview)
    }
  }
  return comments
}

export async function listFacebookComments(postId: string): Promise<FacebookPostPreview[]> {
  const id = postId.trim()
  if (!id) throw new FacebookApiError('Choose a Facebook post first.')
  const connection = await requireConnection()
  const targets = [id]
  if (connection.page_id && /^\d+$/.test(id) && !id.includes('_')) {
    targets.push(`${connection.page_id}_${id}`)
  }
  return listFacebookCommentsFromIds(targets, id)
}

export function facebookRedirectUri(origin: string | undefined) {
  const fallback = env.publicSiteUrl
  if (!origin) return `${fallback}/admin/facebook`
  try {
    const url = new URL(origin)
    return `${url.protocol}//${url.host}/admin/facebook`
  } catch {
    return `${fallback}/admin/facebook`
  }
}

export function facebookOAuthUrl(redirectUri: string, state: string) {
  if (!env.facebookAppId) {
    throw new FacebookApiError('Add FACEBOOK_APP_ID and FACEBOOK_APP_SECRET to connect a Page.')
  }
  const url = new URL(OAUTH_DIALOG)
  url.searchParams.set('client_id', env.facebookAppId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('state', state)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', OAUTH_SCOPES)
  return url.toString()
}

async function exchangeFacebookCode(code: string, redirectUri: string) {
  if (!env.facebookAppId || !env.facebookAppSecret) {
    throw new FacebookApiError('Add FACEBOOK_APP_ID and FACEBOOK_APP_SECRET to connect a Page.')
  }
  const url = new URL(`${GRAPH_BASE}/oauth/access_token`)
  url.searchParams.set('client_id', env.facebookAppId)
  url.searchParams.set('client_secret', env.facebookAppSecret)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('code', code)
  const body = await graphGetUrl<{ access_token?: string }>(url.toString())
  if (!body.access_token) throw new FacebookApiError('Facebook did not return an access token.')
  return body.access_token
}

async function exchangeLongLivedToken(shortToken: string) {
  if (!env.facebookAppId || !env.facebookAppSecret) return shortToken
  const url = new URL(`${GRAPH_BASE}/oauth/access_token`)
  url.searchParams.set('grant_type', 'fb_exchange_token')
  url.searchParams.set('client_id', env.facebookAppId)
  url.searchParams.set('client_secret', env.facebookAppSecret)
  url.searchParams.set('fb_exchange_token', shortToken)
  try {
    const body = await graphGetUrl<{ access_token?: string }>(url.toString())
    return body.access_token || shortToken
  } catch {
    return shortToken
  }
}

export async function listManagedFacebookPages(code: string, redirectUri: string): Promise<FacebookOauthPage[]> {
  const shortToken = await exchangeFacebookCode(code, redirectUri)
  const userToken = await exchangeLongLivedToken(shortToken)
  const pages: FacebookOauthPage[] = []
  let body = await graphGet<GraphList<{ id?: string; name?: string; access_token?: string }>>(
    'me/accounts',
    { fields: 'id,name,access_token', limit: '50' },
    userToken,
  )
  while (true) {
    for (const page of body.data ?? []) {
      if (page.id && page.name && page.access_token && !pages.some((entry) => entry.id === page.id)) {
        pages.push({ id: page.id, name: page.name, access_token: page.access_token })
      }
    }
    if (!body.paging?.next) break
    body = await graphGetUrl<GraphList<{ id?: string; name?: string; access_token?: string }>>(body.paging.next)
  }
  return pages
}

export function toPublicFacebookPages(pages: FacebookOauthPage[]): FacebookPageOption[] {
  return pages.map((page) => ({ id: page.id, name: page.name }))
}

