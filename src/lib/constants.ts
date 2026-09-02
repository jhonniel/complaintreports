export const APP_NAME = 'Tingog Page'
export const CITY_NAME = 'Kidapawan City'
export const TICKET_PREFIX = 'TP'
export const CURRENT_PHASE = 12
export const CURRENT_PHASE_LABEL = 'Production'
export const LAST_TICKET_KEY = 'tingog_last_ticket'

export const PUBLIC_NAV = [
  { to: '/', label: 'Home' },
  { to: '/submit', label: 'Submit Report' },
  { to: '/track', label: 'Track Report' },
  { to: '/about', label: 'About' },
] as const

export const ADMIN_NAV = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { to: '/admin/reports', label: 'Reports', icon: 'FileText' },
  { to: '/admin/map', label: 'Map', icon: 'Map' },
  { to: '/admin/analytics', label: 'Analytics', icon: 'ChartColumn' },
  { to: '/admin/categories', label: 'Categories', icon: 'Tags' },
  { to: '/admin/departments', label: 'Departments', icon: 'Building2' },
  { to: '/admin/settings', label: 'Settings', icon: 'Settings' },
] as const
