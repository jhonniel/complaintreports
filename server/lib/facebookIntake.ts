import type {
  FacebookConvertInput,
  FacebookImportInput,
  FacebookIntakeItem,
} from '../../shared/facebookIntake.ts'
import { isFacebookIntakeKind, isFacebookIntakeStatus } from '../../shared/facebookIntake.ts'
import type { CreateReportInput } from '../../shared/report.ts'

export class DuplicateFacebookIntakeError extends Error {
  constructor() {
    super('This Facebook post or comment is already saved.')
    this.name = 'DuplicateFacebookIntakeError'
  }
}

export class FacebookIntakeNotFoundError extends Error {
  constructor() {
    super('Facebook intake not found.')
    this.name = 'FacebookIntakeNotFoundError'
  }
}

export class FacebookIntakeNotConvertibleError extends Error {
  constructor() {
    super('This Facebook item was already converted or dismissed.')
    this.name = 'FacebookIntakeNotConvertibleError'
  }
}

export function commentKey(commentId: string | null | undefined) {
  return commentId?.trim() || ''
}

export function sameFacebookTarget(
  a: { facebook_post_id: string; facebook_comment_id?: string | null },
  b: { facebook_post_id: string; facebook_comment_id?: string | null },
) {
  return a.facebook_post_id === b.facebook_post_id && commentKey(a.facebook_comment_id) === commentKey(b.facebook_comment_id)
}

export function normalizeFacebookImport(input: FacebookImportInput) {
  const postedAt = input.posted_at?.trim() || null
  const parsed = postedAt ? new Date(postedAt) : null
  return {
    facebook_post_id: input.facebook_post_id.trim(),
    facebook_comment_id: input.facebook_comment_id?.trim() || null,
    permalink: input.permalink.trim(),
    author_name: input.author_name.trim(),
    message: input.message.trim(),
    posted_at: parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : null,
    kind: input.kind,
  }
}

export function asCreateReportInput(input: FacebookConvertInput): CreateReportInput {
  return {
    ...input,
    photos: [],
    location: null,
  }
}

export function toFacebookIntakeItem(row: {
  id: string
  facebook_post_id: string
  facebook_comment_id?: string | null
  permalink: string
  author_name: string
  message: string
  posted_at?: string | null
  kind: string
  status: string
  ticket_number?: string | null
  imported_by_name: string
  created_at: string
}): FacebookIntakeItem {
  return {
    id: row.id,
    facebook_post_id: row.facebook_post_id,
    facebook_comment_id: row.facebook_comment_id?.trim() || null,
    permalink: row.permalink,
    author_name: row.author_name,
    message: row.message,
    posted_at: row.posted_at ?? null,
    kind: isFacebookIntakeKind(row.kind) ? row.kind : 'post',
    status: isFacebookIntakeStatus(row.status) ? row.status : 'new',
    ticket_number: row.ticket_number ?? null,
    imported_by_name: row.imported_by_name,
    created_at: row.created_at,
  }
}
