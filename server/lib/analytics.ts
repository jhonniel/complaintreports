import { createHash } from 'node:crypto'
import {
  ANALYTICS_PERIODS,
  ANALYTICS_RANGES,
  type AnalyticsPeriod,
  type AnalyticsQuery,
  type AnalyticsRange,
  type AnalyticsResponse,
} from '../../shared/analytics.ts'
import { roundAccessCell } from '../../shared/map.ts'
import {
  GENDER_LABELS,
  MANILA_TIME_ZONE,
  REPORT_STATUSES,
  STATUS_LABELS,
  isGender,
  normalizePhilippineMobile,
  type ReportStatus,
} from '../../shared/report.ts'

export interface AnalyticsSourceRow {
  status: ReportStatus
  categoryName: string
  departmentName: string | null
  reporterKey: string
  createdAt: string
  latitude: number | null
  longitude: number | null
  gender: string | null
  birthDate: string | null
}

const PENDING: ReportStatus[] = ['submitted', 'received', 'under_review']

const AGE_GROUPS = [
  { key: 'under_18', label: 'Under 18', min: 0, max: 17 },
  { key: '18_24', label: '18–24', min: 18, max: 24 },
  { key: '25_34', label: '25–34', min: 25, max: 34 },
  { key: '35_44', label: '35–44', min: 35, max: 44 },
  { key: '45_54', label: '45–54', min: 45, max: 54 },
  { key: '55_64', label: '55–64', min: 55, max: 64 },
  { key: '65_plus', label: '65 and over', min: 65, max: 120 },
] as const

function ageAt(birthDate: string, at: Date): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(birthDate.trim())
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const birth = new Date(Date.UTC(year, month - 1, day))
  if (Number.isNaN(birth.getTime())) return null
  const { year: atYear, month: atMonth, day: atDay } = manilaParts(at)
  let age = atYear - year
  if (atMonth < month || (atMonth === month && atDay < day)) age -= 1
  if (age < 0 || age > 120) return null
  return age
}

function ageGroupLabel(age: number | null): string {
  if (age == null) return 'Unknown'
  const group = AGE_GROUPS.find((entry) => age >= entry.min && age <= entry.max)
  return group?.label ?? 'Unknown'
}

function genderLabel(value: string | null): string {
  if (value && isGender(value)) return GENDER_LABELS[value]
  return 'Unknown'
}

export function reporterFingerprint(phone: string) {
  return createHash('sha256').update(normalizePhilippineMobile(phone)).digest('hex')
}

export function parseAnalyticsQuery(input: { period?: unknown; range?: unknown }): AnalyticsQuery {
  const period = ANALYTICS_PERIODS.includes(input.period as AnalyticsPeriod)
    ? (input.period as AnalyticsPeriod)
    : 'monthly'
  const range = ANALYTICS_RANGES.includes(input.range as AnalyticsRange)
    ? (input.range as AnalyticsRange)
    : 'all'
  return { period, range }
}

function manilaParts(date: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: MANILA_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  )
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
  }
}

function utcNoon(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day, 12))
}

function addUtcDays(date: Date, days: number) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function startOfWeekMonday(date: Date) {
  const { year, month, day } = manilaParts(date)
  const noon = utcNoon(year, month, day)
  const dow = noon.getUTCDay()
  const offset = dow === 0 ? -6 : 1 - dow
  return addUtcDays(noon, offset)
}

function rangeStart(range: AnalyticsRange, now: Date): Date | null {
  const { year, month, day } = manilaParts(now)
  const today = utcNoon(year, month, day)
  if (range === 'last_7_days') return addUtcDays(today, -6)
  if (range === 'last_30_days') return addUtcDays(today, -29)
  if (range === 'last_12_months') return utcNoon(year - 1, month, day)
  if (range === 'this_year') return utcNoon(year, 1, 1)
  return null
}

function bucketKey(date: Date, period: AnalyticsPeriod) {
  const { year, month, day } = manilaParts(date)
  if (period === 'daily') {
    return {
      key: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      sort: utcNoon(year, month, day).getTime(),
      label: new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric' }).format(
        utcNoon(year, month, day),
      ),
    }
  }
  if (period === 'weekly') {
    const start = startOfWeekMonday(date)
    const parts = manilaParts(start)
    return {
      key: `w-${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`,
      sort: start.getTime(),
      label: `Week of ${new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric' }).format(start)}`,
    }
  }
  if (period === 'monthly') {
    return {
      key: `${year}-${String(month).padStart(2, '0')}`,
      sort: utcNoon(year, month, 1).getTime(),
      label: new Intl.DateTimeFormat('en-PH', { month: 'long', year: 'numeric' }).format(
        utcNoon(year, month, 1),
      ),
    }
  }
  return {
    key: String(year),
    sort: utcNoon(year, 1, 1).getTime(),
    label: String(year),
  }
}

function nextBucket(date: Date, period: AnalyticsPeriod) {
  const { year, month, day } = manilaParts(date)
  if (period === 'daily') return addUtcDays(utcNoon(year, month, day), 1)
  if (period === 'weekly') return addUtcDays(startOfWeekMonday(date), 7)
  if (period === 'monthly') return month === 12 ? utcNoon(year + 1, 1, 1) : utcNoon(year, month + 1, 1)
  return utcNoon(year + 1, 1, 1)
}

function inRange(createdAt: string, start: Date | null, end: Date) {
  const time = new Date(createdAt).getTime()
  if (Number.isNaN(time)) return false
  if (start && time < start.getTime()) return false
  return time <= end.getTime()
}

export function buildAnalytics(rows: AnalyticsSourceRow[], query: AnalyticsQuery, now = new Date()): AnalyticsResponse {
  const end = now
  const start = rangeStart(query.range, now)
  const filtered = rows.filter((row) => inRange(row.createdAt, start, end))

  const firstSeen = new Map<string, number>()
  for (const row of rows) {
    const time = new Date(row.createdAt).getTime()
    if (Number.isNaN(time)) continue
    const previous = firstSeen.get(row.reporterKey)
    if (previous === undefined || time < previous) firstSeen.set(row.reporterKey, time)
  }

  const keysInRange = new Set(filtered.map((row) => row.reporterKey))
  const reportCounts = new Map<string, number>()
  for (const row of rows) {
    reportCounts.set(row.reporterKey, (reportCounts.get(row.reporterKey) ?? 0) + 1)
  }

  let newUsers = 0
  let returningUsers = 0
  for (const key of keysInRange) {
    const first = firstSeen.get(key) ?? 0
    if (start) {
      if (first >= start.getTime()) newUsers += 1
      else returningUsers += 1
    } else if ((reportCounts.get(key) ?? 0) > 1) {
      returningUsers += 1
    } else {
      newUsers += 1
    }
  }

  const totals = {
    total: filtered.length,
    pending: filtered.filter((row) => PENDING.includes(row.status)).length,
    in_progress: filtered.filter((row) => row.status === 'in_progress').length,
    resolved: filtered.filter((row) => row.status === 'resolved').length,
    closed: filtered.filter((row) => row.status === 'closed').length,
    rejected: filtered.filter((row) => row.status === 'rejected').length,
    reporting_users: firstSeen.size,
    assigned: filtered.filter((row) => Boolean(row.departmentName)).length,
    unassigned: filtered.filter((row) => !row.departmentName).length,
  }

  const categoryMap = new Map<string, number>()
  for (const row of filtered) {
    categoryMap.set(row.categoryName, (categoryMap.get(row.categoryName) ?? 0) + 1)
  }
  const categories = [...categoryMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  const statusMap = new Map<ReportStatus, number>()
  for (const status of REPORT_STATUSES) statusMap.set(status, 0)
  for (const row of filtered) {
    statusMap.set(row.status, (statusMap.get(row.status) ?? 0) + 1)
  }
  const statuses = REPORT_STATUSES.map((status) => ({
    status,
    name: STATUS_LABELS[status],
    count: statusMap.get(status) ?? 0,
  }))

  const counts = new Map<string, { label: string; sort: number; count: number }>()
  let seriesStart = start
  if (!seriesStart && rows.length) {
    const earliest = rows.reduce((min, row) => (row.createdAt < min.createdAt ? row : min))
    const parts = manilaParts(new Date(earliest.createdAt))
    seriesStart = utcNoon(parts.year, parts.month, parts.day)
  }
  if (!seriesStart) {
    const parts = manilaParts(now)
    seriesStart = utcNoon(parts.year, parts.month, parts.day)
  }

  if (filtered.length || rows.length) {
    let cursor = bucketKey(seriesStart, query.period)
    let cursorDate = seriesStart
    const endBucket = bucketKey(end, query.period)
    while (cursor.sort <= endBucket.sort) {
      counts.set(cursor.key, { label: cursor.label, sort: cursor.sort, count: 0 })
      cursorDate = nextBucket(cursorDate, query.period)
      cursor = bucketKey(cursorDate, query.period)
      if (counts.size > 400) break
    }
  }

  for (const row of filtered) {
    const bucket = bucketKey(new Date(row.createdAt), query.period)
    const current = counts.get(bucket.key)
    if (current) current.count += 1
    else counts.set(bucket.key, { label: bucket.label, sort: bucket.sort, count: 1 })
  }

  const timeseries = [...counts.values()]
    .sort((a, b) => a.sort - b.sort)
    .map((entry) => ({ name: entry.label, count: entry.count }))

  const departmentMap = new Map<string, number>()
  for (const row of filtered) {
    const name = row.departmentName ?? 'Unassigned'
    departmentMap.set(name, (departmentMap.get(name) ?? 0) + 1)
  }
  const departments = [...departmentMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  const areaMap = new Map<string, { latitude: number; longitude: number; count: number }>()
  let withLocation = 0
  for (const row of filtered) {
    if (row.latitude == null || row.longitude == null) continue
    withLocation += 1
    const latitude = roundAccessCell(row.latitude)
    const longitude = roundAccessCell(row.longitude)
    const key = `${latitude},${longitude}`
    const current = areaMap.get(key)
    if (current) current.count += 1
    else areaMap.set(key, { latitude, longitude, count: 1 })
  }
  const areas = [...areaMap.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 12)
    .map((area) => ({
      latitude: area.latitude,
      longitude: area.longitude,
      count: area.count,
      label: formatAreaLabel(area.latitude, area.longitude),
    }))

  const genderMap = new Map<string, number>()
  for (const gender of Object.values(GENDER_LABELS) as string[]) genderMap.set(gender, 0)
  for (const row of filtered) {
    const name = genderLabel(row.gender)
    genderMap.set(name, (genderMap.get(name) ?? 0) + 1)
  }
  const genders = [...genderMap.entries()]
    .filter(([name, count]) => name !== 'Unknown' || count > 0)
    .map(([name, count]) => ({ name, count }))

  const ageMap = new Map<string, number>()
  for (const group of AGE_GROUPS) ageMap.set(group.label, 0)
  ageMap.set('Unknown', 0)
  for (const row of filtered) {
    const label = ageGroupLabel(ageAt(row.birthDate ?? '', new Date(row.createdAt)))
    ageMap.set(label, (ageMap.get(label) ?? 0) + 1)
  }
  const ages = [...ageMap.entries()]
    .filter(([name, count]) => name !== 'Unknown' || count > 0)
    .map(([name, count]) => ({ name, count }))

  return {
    query,
    totals,
    users: {
      total: keysInRange.size,
      new: newUsers,
      returning: returningUsers,
    },
    timeseries,
    categories,
    statuses,
    departments,
    geography: {
      with_location: withLocation,
      without_location: filtered.length - withLocation,
      areas,
    },
    demographics: { genders, ages },
  }
}

function formatAreaLabel(latitude: number, longitude: number) {
  const ns = latitude >= 0 ? 'N' : 'S'
  const ew = longitude >= 0 ? 'E' : 'W'
  return `${Math.abs(latitude).toFixed(3)}°${ns}, ${Math.abs(longitude).toFixed(3)}°${ew}`
}
