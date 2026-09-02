import { z } from 'zod'
import { parseAdminReportListQuery } from './adminReport.ts'
import type { ReportPriority, ReportStatus } from './report.ts'

export const KIDAPAWAN_CENTER: [number, number] = [125.0894, 7.0083]
export const ACCESS_CELL_DECIMALS = 3

export const PUBLIC_ACCESS_PAGES = [
  '/',
  '/submit',
  '/submit/success',
  '/track',
  '/about',
  '/privacy',
  '/terms',
  '/contact',
] as const

export type PublicAccessPage = (typeof PUBLIC_ACCESS_PAGES)[number]

export interface MapFilterQuery {
  status: ReportStatus | null
  category_id: string | null
  priority: ReportPriority | null
  department_id: string | null
  date_from: string | null
  date_to: string | null
}

export interface AccessMapQuery {
  date_from: string | null
  date_to: string | null
}

export interface MapReportPoint {
  ticket_number: string
  category_name: string
  status: ReportStatus
  priority: ReportPriority
  created_at: string
  latitude: number
  longitude: number
}

export function toMapReportPoint(point: MapReportPoint): MapReportPoint {
  return {
    ticket_number: point.ticket_number,
    category_name: point.category_name,
    status: point.status,
    priority: point.priority,
    created_at: point.created_at,
    latitude: point.latitude,
    longitude: point.longitude,
  }
}

export interface MapAccessCluster {
  latitude: number
  longitude: number
  count: number
}

export function toMapAccessCluster(cluster: MapAccessCluster): MapAccessCluster {
  return {
    latitude: cluster.latitude,
    longitude: cluster.longitude,
    count: cluster.count,
  }
}

export interface CreateAccessLogInput {
  session_id: string
  latitude: number
  longitude: number
  accuracy?: number | null
  page?: string
}

export const createAccessLogSchema = z.object({
  session_id: z.string().trim().min(8).max(80),
  latitude: z.number().gte(-90).lte(90),
  longitude: z.number().gte(-180).lte(180),
  accuracy: z.number().nonnegative().nullable().optional(),
  page: z.string().trim().max(80).optional(),
  website: z.string().optional(),
})

export function parseMapFilterQuery(input: Record<string, unknown>): MapFilterQuery {
  const parsed = parseAdminReportListQuery(input)
  return {
    status: parsed.status,
    category_id: parsed.category_id,
    priority: parsed.priority,
    department_id: parsed.department_id,
    date_from: parsed.date_from,
    date_to: parsed.date_to,
  }
}

export function parseAccessMapQuery(input: Record<string, unknown>): AccessMapQuery {
  const parsed = parseAdminReportListQuery(input)
  return { date_from: parsed.date_from, date_to: parsed.date_to }
}

export function normalizeAccessPage(value: string | undefined): string {
  const page = value && value.trim().length > 0 ? value.trim() : '/'
  return (PUBLIC_ACCESS_PAGES as readonly string[]).includes(page) ? page : '/'
}

export function roundAccessCell(value: number) {
  const factor = 10 ** ACCESS_CELL_DECIMALS
  return Math.round(value * factor) / factor
}
