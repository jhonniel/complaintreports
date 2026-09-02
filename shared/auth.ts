export const ADMIN_ROLES = ['super_admin', 'admin', 'staff'] as const

export type AdminRole = (typeof ADMIN_ROLES)[number]

export const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: 'Super admin',
  admin: 'Administrator',
  staff: 'Staff',
}

export function isAdminRole(value: string): value is AdminRole {
  return (ADMIN_ROLES as readonly string[]).includes(value)
}

export function canManageCatalog(role: AdminRole) {
  return role === 'admin' || role === 'super_admin'
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'AD'
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}
