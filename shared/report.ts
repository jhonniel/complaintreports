import { z } from 'zod'

export const GENDERS = ['female', 'male', 'non_binary', 'prefer_not_to_say'] as const
export type Gender = (typeof GENDERS)[number]

export const GENDER_LABELS: Record<Gender, string> = {
  female: 'Female',
  male: 'Male',
  non_binary: 'Non-binary',
  prefer_not_to_say: 'Prefer not to say',
}

export function isGender(value: string): value is Gender {
  return (GENDERS as readonly string[]).includes(value)
}

export const TICKET_PREFIX = 'TP'
export const TICKET_PATTERN = /^TP-\d{4}-\d{6}$/
export const MANILA_TIME_ZONE = 'Asia/Manila'

export const PH_MOBILE_PATTERN = /^09\d{9}$/
export const PH_MOBILE_DIGIT_COUNT = 11

export function stripPhone(value: string) {
  return value.replace(/\D/g, '')
}

export function limitPhoneDigits(value: string) {
  return stripPhone(value).slice(0, PH_MOBILE_DIGIT_COUNT)
}

export function isPhilippineMobile(value: string) {
  return PH_MOBILE_PATTERN.test(stripPhone(value))
}

export function normalizePhilippineMobile(value: string) {
  const compact = stripPhone(value)
  if (compact.startsWith('09') && compact.length === 11) return `+63${compact.slice(1)}`
  if (compact.startsWith('63') && compact.length === 12) return `+${compact}`
  return compact
}

export function currentManilaYear(date = new Date()) {
  return Number(
    new Intl.DateTimeFormat('en-PH', { timeZone: MANILA_TIME_ZONE, year: 'numeric' }).format(date),
  )
}

export function formatTicketNumber(year: number, sequence: number) {
  return `${TICKET_PREFIX}-${year}-${String(sequence).padStart(6, '0')}`
}

export function randomTicketSerial() {
  const bytes = new Uint32Array(1)
  crypto.getRandomValues(bytes)
  return 1 + (bytes[0] % 999_999)
}

export function normalizeTicketNumber(value: string) {
  const compact = value
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '')
    .replace(/[–—−]/g, '-')
    .trim()
    .toUpperCase()
    .replace(/[\s_]+/g, '')
  const rest = compact.replace(/^TP-?/, '').replace(/-/g, '')
  const exact = /^(\d{4})(\d{1,6})$/.exec(rest)
  if (exact) return `TP-${exact[1]}-${exact[2].padStart(6, '0')}`
  const embedded = /TP-?(\d{4})-?(\d{1,6})/.exec(compact)
  if (embedded) return `TP-${embedded[1]}-${embedded[2].padStart(6, '0')}`
  return compact
}

export function isTicketNumber(value: string) {
  return TICKET_PATTERN.test(normalizeTicketNumber(value))
}

export const REPORT_STATUSES = [
  'submitted',
  'received',
  'under_review',
  'in_progress',
  'resolved',
  'closed',
  'rejected',
] as const

export type ReportStatus = (typeof REPORT_STATUSES)[number]

export const PUBLIC_TIMELINE_STATUSES = [
  'submitted',
  'received',
  'under_review',
  'in_progress',
  'resolved',
  'closed',
] as const

export type PublicTimelineStatus = (typeof PUBLIC_TIMELINE_STATUSES)[number]

export const STATUS_LABELS: Record<ReportStatus, string> = {
  submitted: 'Submitted',
  received: 'Received',
  under_review: 'Under Review',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
  rejected: 'Rejected',
}

export function isReportStatus(value: string): value is ReportStatus {
  return (REPORT_STATUSES as readonly string[]).includes(value)
}

export const REPORT_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const
export type ReportPriority = (typeof REPORT_PRIORITIES)[number]

export const PRIORITY_LABELS: Record<ReportPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
}

export const PRIORITY_RANK: Record<ReportPriority, number> = {
  low: 0,
  medium: 1,
  high: 2,
  urgent: 3,
}

export function isReportPriority(value: string): value is ReportPriority {
  return (REPORT_PRIORITIES as readonly string[]).includes(value)
}

function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const parsed = new Date(year, month - 1, day)
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function isReasonableBirthDate(value: string) {
  if (!isIsoDate(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const birth = new Date(year, month - 1, day)
  const today = startOfLocalDay(new Date())
  const oldest = new Date(today)
  oldest.setFullYear(today.getFullYear() - 120)
  return birth.getTime() <= today.getTime() && birth.getTime() >= oldest.getTime()
}

export const locationSchema = z
  .object({
    latitude: z.coerce.number().gte(-90).lte(90),
    longitude: z.coerce.number().gte(-180).lte(180),
    accuracy: z.number().nonnegative().nullable().optional(),
    timestamp: z.string().min(1),
  })
  .nullable()
  .optional()

export function combinePersonName(firstName: string, lastName: string) {
  return `${firstName.trim()} ${lastName.trim()}`.replace(/\s+/g, ' ').trim()
}

export const personalFieldsSchema = z.object({
  first_name: z
    .string()
    .trim()
    .min(2, 'Enter your first name')
    .max(80, 'First name is too long'),
  last_name: z
    .string()
    .trim()
    .min(2, 'Enter your last name')
    .max(80, 'Last name is too long'),
  birth_date: z
    .string()
    .trim()
    .refine(isReasonableBirthDate, 'Enter a valid birth date'),
  gender: z.enum(GENDERS, { error: 'Select a gender' }),
  address: z
    .string()
    .trim()
    .min(5, 'Enter your address')
    .max(300, 'Address is too long'),
  phone: z
    .string()
    .trim()
    .refine(isPhilippineMobile, 'Enter an 11-digit mobile number, for example 09171234567'),
  email: z
    .string()
    .trim()
    .max(160, 'Email is too long')
    .refine((value) => value.length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), 'Enter a valid email address')
    .optional(),
})

export const reportFieldsSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, 'Describe your report in a short title')
    .max(120, 'Title is too long'),
  category_id: z.string().uuid('Choose a category'),
  description: z
    .string()
    .trim()
    .min(20, 'Please add more detail so staff can review your report')
    .max(5000, 'Description is too long'),
})

export const REPORT_PHOTO_MAX_COUNT = 5
export const REPORT_PHOTO_MAX_TOTAL_BYTES = 10 * 1024 * 1024
export const REPORT_PHOTO_MAX_FILE_BYTES = 4 * 1024 * 1024
export const REPORT_PHOTO_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export type ReportPhotoContentType = (typeof REPORT_PHOTO_CONTENT_TYPES)[number]

export function isReportPhotoContentType(value: string): value is ReportPhotoContentType {
  return (REPORT_PHOTO_CONTENT_TYPES as readonly string[]).includes(value)
}

export const reportPhotoSchema = z.object({
  key: z.string().trim().min(8).max(240),
  content_type: z.enum(REPORT_PHOTO_CONTENT_TYPES),
  byte_size: z.number().int().positive().max(REPORT_PHOTO_MAX_FILE_BYTES),
})

export const reportPhotosSchema = z
  .array(reportPhotoSchema)
  .max(REPORT_PHOTO_MAX_COUNT, 'You can attach up to 5 photos')
  .superRefine((photos, ctx) => {
    const total = photos.reduce((sum, photo) => sum + photo.byte_size, 0)
    if (total > REPORT_PHOTO_MAX_TOTAL_BYTES) {
      ctx.addIssue({ code: 'custom', message: 'Photos must be 10 MB or less in total' })
    }
  })

export const createReportSchema = personalFieldsSchema.extend(reportFieldsSchema.shape).extend({
  location: locationSchema,
  photos: reportPhotosSchema.optional().default([]),
  website: z.string().optional(),
  tp_hp: z.string().optional(),
  captcha_token: z.string().max(2048).optional(),
})

export type CreateReportInput = z.infer<typeof createReportSchema>

export interface PublicCategory {
  id: string
  name: string
  description: string | null
}

export interface CreateReportResponse {
  ticket_number: string
  status: 'submitted'
  created_at: string
  category_name: string
}

export interface PublicTrackView {
  ticket_number: string
  status: ReportStatus
  category_name: string
  created_at: string
  updated_at: string
}

export function toPublicCategory(category: PublicCategory): PublicCategory {
  return {
    id: category.id,
    name: category.name,
    description: category.description,
  }
}

export function toPublicTrackView(report: PublicTrackView): PublicTrackView {
  return {
    ticket_number: report.ticket_number,
    status: report.status,
    category_name: report.category_name,
    created_at: report.created_at,
    updated_at: report.updated_at,
  }
}

export function toCreateReportResponse(created: CreateReportResponse): CreateReportResponse {
  return {
    ticket_number: created.ticket_number,
    status: created.status,
    created_at: created.created_at,
    category_name: created.category_name,
  }
}

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.map(String).join('.')
    if (key && !result[key]) result[key] = issue.message
  }
  return result
}
