import type { AdminRole } from '../../shared/auth.ts'

export function scopedStaffDepartmentId(actor: {
  role: AdminRole
  departmentId?: string | null
} | null | undefined) {
  if (actor?.role === 'staff' && actor.departmentId) return actor.departmentId
  return null
}

export function canAccessDepartmentReport(
  actor: { role: AdminRole; departmentId?: string | null } | null | undefined,
  assignedDepartmentId: string | null,
) {
  const scoped = scopedStaffDepartmentId(actor)
  if (!scoped) return true
  return assignedDepartmentId === scoped
}
