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
  url: z.string().trim().min(8, 'Paste a Facebook post link').max(500, 'That link is too long'),
})

export const facebookImportSchema = z.object({
  facebook_post_id: z.string().trim().min(1).max(80),
  facebook_comment_id: z.string().trim().max(80).nullable().optional(),
  permalink: z
    .string()
    .trim()
    .max(500)
    .refine((value) => value.startsWith('http://') || value.startsWith('https://'), 'Enter a valid Facebook link'),
  author_name: z.string().trim().min(1, 'Enter the author name').max(120, 'Author name is too long'),
  message: z.string().trim().min(8, 'Paste the post or comment').max(5000, 'That text is too long'),
  posted_at: z.string().trim().max(40).nullable().optional(),
  kind: z.enum(FACEBOOK_INTAKE_KINDS),
})

export const facebookConvertSchema = personalFieldsSchema.extend(reportFieldsSchema.shape)

export const facebookIntakeListQuerySchema = z.object({
  status: z.enum(FACEBOOK_INTAKE_STATUSES).optional(),
})

export const facebookCommentsQuerySchema = z.object({
  post_id: z.string().trim().min(1, 'Choose a Facebook post first').max(80),
})

export type FacebookLookupInput = z.infer<typeof facebookLookupSchema>
export type FacebookImportInput = z.infer<typeof facebookImportSchema>
export type FacebookConvertInput = z.infer<typeof facebookConvertSchema>
export type FacebookIntakeListQuery = z.infer<typeof facebookIntakeListQuerySchema>

export interface FacebookConnectionStatus {
  configured: boolean
  page_configured: boolean
}

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
    host.endsWith('.facebook.com')
  )
}

export function normalizeFacebookPermalink(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return trimmed
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
  return `https://${trimmed}`
}

export function parseFacebookTarget(input: string) {
  const trimmed = input.trim()
  if (!trimmed) return null
  if (/^\d+_\d+$/.test(trimmed) || /^\d{8,}$/.test(trimmed)) {
    return { kind: 'id' as const, value: trimmed }
  }
  try {
    const url = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`)
    if (!isFacebookHost(url.hostname)) return null
    const story = url.searchParams.get('story_fbid')
    const pageId = url.searchParams.get('id')
    if (story && pageId && /^\d+$/.test(story) && /^\d+$/.test(pageId)) {
      return { kind: 'id' as const, value: `${pageId}_${story}` }
    }
    const posts = /\/posts\/(\d+)/.exec(url.pathname)
    if (posts?.[1]) return { kind: 'id' as const, value: posts[1] }
    const videos = /\/videos\/(\d+)/.exec(url.pathname)
    if (videos?.[1]) return { kind: 'id' as const, value: videos[1] }
    const reel = /\/reel\/(\d+)/.exec(url.pathname)
    if (reel?.[1]) return { kind: 'id' as const, value: reel[1] }
    return { kind: 'url' as const, value: url.toString() }
  } catch {
    return null
  }
}

export function titleFromFacebookMessage(message: string) {
  const compact = message.replace(/\s+/g, ' ').trim()
  if (compact.length >= 5) return compact.slice(0, 120)
  return 'Facebook civic concern'
}

export function descriptionFromFacebookIntake(item: Pick<FacebookPostPreview, 'message' | 'permalink' | 'author_name' | 'kind'>) {
  const lines = [
    item.message.trim(),
    '',
    `Imported from a Facebook ${item.kind}.`,
    item.author_name ? `Author: ${item.author_name}` : '',
    item.permalink,
  ].filter((line) => line.length > 0)
  const text = lines.join('\n')
  if (text.length >= 20) return text.slice(0, 5000)
  return `${text}\nKidapawan City Facebook intake.`.slice(0, 5000)
}

export function fallbackFacebookIds(permalink: string, message: string, kind: FacebookIntakeKind) {
  const parsed = parseFacebookTarget(permalink)
  const postId = parsed?.kind === 'id' ? parsed.value : `paste_${hashId(permalink)}`
  return {
    facebook_post_id: postId.slice(0, 80),
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
