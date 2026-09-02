export const ANALYTICS_PERIODS = ['daily', 'weekly', 'monthly', 'yearly'] as const
export type AnalyticsPeriod = (typeof ANALYTICS_PERIODS)[number]

export const ANALYTICS_RANGES = [
  'last_7_days',
  'last_30_days',
  'last_12_months',
  'this_year',
  'all',
] as const
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number]

export const PERIOD_LABELS: Record<AnalyticsPeriod, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
}

export const RANGE_LABELS: Record<AnalyticsRange, string> = {
  last_7_days: 'Last 7 days',
  last_30_days: 'Last 30 days',
  last_12_months: 'Last 12 months',
  this_year: 'This year',
  all: 'All time',
}

export interface AnalyticsQuery {
  period: AnalyticsPeriod
  range: AnalyticsRange
}

export interface AnalyticsTotals {
  total: number
  pending: number
  in_progress: number
  resolved: number
  closed: number
  rejected: number
  reporting_users: number
  assigned: number
  unassigned: number
}

export interface AnalyticsUsers {
  total: number
  new: number
  returning: number
}

export interface NamedCount {
  name: string
  count: number
}

export interface StatusCount {
  status: string
  name: string
  count: number
}

export interface AnalyticsGeography {
  with_location: number
  without_location: number
  areas: GeoAreaCount[]
}

export interface GeoAreaCount {
  latitude: number
  longitude: number
  count: number
  label: string
}

export interface AnalyticsDemographics {
  genders: NamedCount[]
  ages: NamedCount[]
}

export interface AnalyticsResponse {
  query: AnalyticsQuery
  totals: AnalyticsTotals
  users: AnalyticsUsers
  timeseries: NamedCount[]
  categories: NamedCount[]
  statuses: StatusCount[]
  departments: NamedCount[]
  geography: AnalyticsGeography
  demographics: AnalyticsDemographics
}

export interface AnalyticsGeography {
  with_location: number
  without_location: number
  areas: GeoAreaCount[]
}

export interface GeoAreaCount {
  latitude: number
  longitude: number
  count: number
  label: string
}
