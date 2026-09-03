import { z } from 'zod'
import { personalFieldsSchema, reportFieldsSchema } from './report.ts'

export const FACEBOOK_INTAKE_STATUSES = ['new', 'converted', 'dismissed'] as const
export type FacebookIntakeStatus = (typeof FACEBOOK_INTAKE_STATUSES)[number]

export const FACEBOOK_INTAKE_KINDS = ['post', 'comment'] as const
export type FacebookIntakeKind = (typeof FACEBOOK_INTAKE_KINDS)[number]

export const FACEBOOK_INTAKE_STATUS_LABELS: Record<FacebookIntakeStatus, string> = {
  new: 'New',
  converted: 'Ticket created',
  dismissed: 'Dismissed',
}

export interface FacebookPostPreview {
  facebook_post_id: string
  facebook_comment_id: string | null
  permalink: string
  author_name: string
  message: string
  posted_at: string | null
  kind: FacebookIntakeKind
}

export interface FacebookIntakeItem extends FacebookPostPreview {
  id: string
  status: FacebookIntakeStatus
  ticket_number: string | null
  imported_by_name: string
  created_at: string
}

export const facebookLookupSchema = z.object({
  url: z.string().trim().min(8, 'Paste a Facebook post link').max(2000, 'That link is too long'),
})

export const FACEBOOK_OBJECT_ID_MAX = 200

export const facebookImportSchema = z.object({
  facebook_post_id: z.string().trim().min(1).max(FACEBOOK_OBJECT_ID_MAX),
  facebook_comment_id: z.string().trim().max(FACEBOOK_OBJECT_ID_MAX).nullable().optional(),
  permalink: z
    .string()
    .trim()
    .max(2000)
    .refine((value) => value.startsWith('http://') || value.startsWith('https://'), 'Enter a valid Facebook link'),
  author_name: z.string().trim().min(1, 'Enter the author name').max(120, 'Author name is too long'),
  message: z
    .string()
    .trim()
    .min(1, 'Paste the post or comment text. A Facebook link alone is not enough.')
    .max(5000, 'That text is too long'),
  posted_at: z.string().trim().max(40).nullable().optional(),
  kind: z.enum(FACEBOOK_INTAKE_KINDS),
})

export const facebookConvertSchema = personalFieldsSchema.extend(reportFieldsSchema.shape)

export const facebookIntakeListQuerySchema = z.object({
  status: z.enum(FACEBOOK_INTAKE_STATUSES).optional(),
})

export const facebookCommentsQuerySchema = z.object({
  post_id: z.string().trim().min(1, 'Choose a Facebook post first').max(FACEBOOK_OBJECT_ID_MAX),
})

export const facebookImportCommentsSchema = z
  .object({
    url: z.string().trim().max(2000).optional(),
    post_id: z.string().trim().max(FACEBOOK_OBJECT_ID_MAX).optional(),
    category_id: z.string().uuid().optional(),
    include_post: z.boolean().optional(),
  })
  .refine((value) => Boolean(value.url?.trim() || value.post_id?.trim()), {
    message: 'Paste a Facebook post link or choose a post first.',
  })

export type FacebookLookupInput = z.infer<typeof facebookLookupSchema>
export type FacebookImportInput = z.infer<typeof facebookImportSchema>
export type FacebookConvertInput = z.infer<typeof facebookConvertSchema>
export type FacebookIntakeListQuery = z.infer<typeof facebookIntakeListQuerySchema>
export type FacebookImportCommentsInput = z.infer<typeof facebookImportCommentsSchema>

export interface FacebookImportCommentsResult {
  created: number
  skipped: number
  comment_count: number
  intakes: FacebookIntakeItem[]
}

export const FACEBOOK_IMPORT_ADDRESS = 'Imported from Facebook, Kidapawan City'
export const FACEBOOK_IMPORT_PHONE = '09000000000'
export const FACEBOOK_IMPORT_BIRTH_DATE = '1970-01-01'

export function facebookReporterName(authorName: string) {
  const names = splitAuthorName(authorName)
  let first_name = names.first_name.trim() || 'Facebook'
  let last_name = names.last_name.trim()
  if (first_name.length < 2) first_name = 'Facebook'
  if (last_name.length < 2) last_name = 'resident'
  return {
    first_name: first_name.slice(0, 80),
    last_name: last_name.slice(0, 80),
  }
}

export function reportInputFromFacebookPreview(
  item: FacebookPostPreview,
  categoryId: string,
): FacebookConvertInput {
  const names = facebookReporterName(item.author_name)
  return {
    ...names,
    birth_date: FACEBOOK_IMPORT_BIRTH_DATE,
    gender: 'prefer_not_to_say',
    address: FACEBOOK_IMPORT_ADDRESS,
    phone: FACEBOOK_IMPORT_PHONE,
    title: titleFromFacebookMessage(item.message),
    category_id: categoryId,
    description: descriptionFromFacebookIntake(item),
  }
}

export interface FacebookConnectionStatus {
  oauth_ready: boolean
  configured: boolean
  page_configured: boolean
  page_id: string | null
  page_name: string | null
  source: 'oauth' | 'env' | null
}

export interface FacebookPageOption {
  id: string
  name: string
}

export const facebookOauthStartSchema = z.object({
  origin: z.string().trim().max(200).optional(),
})

export const facebookOauthCompleteSchema = z.object({
  code: z.string().trim().min(8, 'Facebook did not return a login code').max(2000),
  state: z.string().trim().min(8).max(200),
  origin: z.string().trim().max(200).optional(),
})

export const facebookOauthSelectSchema = z.object({
  session_id: z.string().uuid(),
  page_id: z.string().trim().min(1).max(80),
})

export function isFacebookIntakeStatus(value: unknown): value is FacebookIntakeStatus {
  return typeof value === 'string' && (FACEBOOK_INTAKE_STATUSES as readonly string[]).includes(value)
}

export function isFacebookIntakeKind(value: unknown): value is FacebookIntakeKind {
  return typeof value === 'string' && (FACEBOOK_INTAKE_KINDS as readonly string[]).includes(value)
}

export function splitAuthorName(name: string) {
  const parts = name.trim().replace(/\s+/g, ' ').split(' ').filter(Boolean)
  if (parts.length === 0) return { first_name: '', last_name: '' }
  if (parts.length === 1) return { first_name: parts[0], last_name: '' }
  return { first_name: parts.slice(0, -1).join(' '), last_name: parts[parts.length - 1] }
}

export function isFacebookHost(hostname: string) {
  const host = hostname.toLowerCase()
  return (
    host === 'facebook.com' ||
    host === 'www.facebook.com' ||
    host === 'm.facebook.com' ||
    host === 'web.facebook.com' ||
    host === 'fb.com' ||
    host === 'www.fb.com' ||
    host === 'l.facebook.com' ||
    host === 'lm.facebook.com' ||
    host.endsWith('.facebook.com')
  )
}

export function normalizeFacebookPermalink(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return trimmed
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
  return `https://${trimmed}`
}

export function isFacebookShareLink(input: string) {
  try {
    const url = new URL(input.includes('://') ? input : `https://${input}`)
    return (
      /\/share\/[pv]\//i.test(url.pathname) ||
      url.hostname === 'fb.watch' ||
      url.hostname === 'www.fb.watch'
    )
  } catch {
    return false
  }
}

export function canonicalFacebookPermalink(input: string) {
  try {
    const url = new URL(input)
    for (const key of ['rdid', 'share_url', 'mibextid', 'refsrc', 'ref', 'sfnsn', 'fs', 's', 'locale']) {
      url.searchParams.delete(key)
    }
    url.hash = ''
    return url.toString()
  } catch {
    return input
  }
}

export function parseFacebookTarget(input: string) {
  const trimmed = input.trim()
  if (!trimmed) return null
  if (/^\d+_\d+$/.test(trimmed) || /^\d{8,}$/.test(trimmed) || /^pfbid[a-zA-Z0-9]+$/.test(trimmed)) {
    return { kind: 'id' as const, value: trimmed, url: null as string | null, page_id: null as string | null }
  }
  try {
    let url = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`)
    const wrapped = url.searchParams.get('u')
    if ((url.hostname === 'l.facebook.com' || url.hostname === 'lm.facebook.com') && wrapped) {
      url = new URL(wrapped)
    }
    if (!isFacebookHost(url.hostname) && url.hostname !== 'fb.watch' && url.hostname !== 'www.fb.watch') {
      return null
    }
    if (/\/share\/[pv]\//i.test(url.pathname)) {
      return { kind: 'url' as const, value: url.toString(), url: url.toString(), page_id: null as string | null }
    }
    const permalink = canonicalFacebookPermalink(url.toString())
    const isPhotoPath = /\/photo(\.php)?\/?$/i.test(url.pathname) || /\/photos\//i.test(url.pathname)
    const story = url.searchParams.get('story_fbid') || url.searchParams.get('fbid')
    const pageId = url.searchParams.get('id')
    const object = isPhotoPath ? ('photo' as const) : ('post' as const)
    if (story && pageId && /^\d+$/.test(pageId) && /^(\d+|pfbid[a-zA-Z0-9]+)$/.test(story)) {
      return {
        kind: 'id' as const,
        value: /^\d+$/.test(story) ? `${pageId}_${story}` : story,
        url: permalink,
        page_id: pageId,
        object,
      }
    }
    if (story && /^(\d+|pfbid[a-zA-Z0-9]+)$/.test(story)) {
      return {
        kind: 'id' as const,
        value: story,
        url: permalink,
        page_id: pageId && /^\d+$/.test(pageId) ? pageId : null,
        object,
      }
    }
    const videoQuery = url.searchParams.get('v')
    if (videoQuery && /^\d+$/.test(videoQuery)) {
      return { kind: 'id' as const, value: videoQuery, url: permalink, page_id: null as string | null }
    }
    const pathPatterns = [
      /\/posts\/(pfbid[a-zA-Z0-9]+|\d+)/,
      /\/permalink\/(\d+)/,
      /\/videos\/(\d+)/,
      /\/reel\/(\d+)/,
      /\/reels\/(\d+)/,
      /\/watch\/(\d+)/,
      /\/groups\/\d+\/posts\/(\d+)/,
      /\/photos\/[^/]+\/(\d+)/,
    ] as const
    for (const pattern of pathPatterns) {
      const match = pattern.exec(url.pathname)
      if (match?.[1]) {
        return {
          kind: 'id' as const,
          value: match[1],
          url: permalink,
          page_id: null as string | null,
          object: /\/photos\//i.test(url.pathname) ? ('photo' as const) : object,
        }
      }
    }
    return { kind: 'url' as const, value: permalink, url: permalink, page_id: null as string | null, object }
  } catch {
    return null
  }
}

export function displayFacebookMessage(message: string, kind: FacebookIntakeKind) {
  const trimmed = message.trim()
  if (trimmed) return trimmed
  return kind === 'comment' ? 'Facebook comment' : '(No caption)'
}

export function titleFromFacebookMessage(message: string) {
  const compact = message.replace(/\s+/g, ' ').trim()
  if (compact.length >= 5) return compact.slice(0, 120)
  return 'Facebook civic concern'
}

export function descriptionFromFacebookIntake(item: Pick<FacebookPostPreview, 'message' | 'permalink' | 'author_name' | 'kind'>) {
  const lines = [
    item.message.trim() || 'Facebook comment',
    '',
    `Imported from a Facebook ${item.kind}.`,
    item.author_name ? `Author: ${item.author_name}` : '',
    item.permalink,
    '',
    'Facebook did not provide a mobile number or home address. Update this ticket if staff obtain contact details.',
  ].filter((line) => line.length > 0)
  const text = lines.join('\n')
  if (text.length >= 20) return text.slice(0, 5000)
  return `${text}\nKidapawan City Facebook intake.`.slice(0, 5000)
}

export function fallbackFacebookIds(permalink: string, message: string, kind: FacebookIntakeKind) {
  const parsed = parseFacebookTarget(permalink)
  const postId = parsed?.kind === 'id' ? parsed.value : `paste_${hashId(permalink)}`
  return {
    facebook_post_id: postId.slice(0, FACEBOOK_OBJECT_ID_MAX),
    facebook_comment_id: kind === 'comment' ? `c_${hashId(message)}` : null,
  }
}

function hashId(value: string) {
  let hash = 2166136261
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16)
}
