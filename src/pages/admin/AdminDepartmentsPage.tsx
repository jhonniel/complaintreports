import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CatalogItem } from '@shared/catalog'
import type { StaffOption } from '@shared/adminReport'
import { canManageCatalog, canManageStaff } from '@shared/auth'
import { CatalogManager } from '@/features/admin/CatalogManager'
import { DepartmentUserDialogs, DepartmentUsersPanel } from '@/features/admin/DepartmentMembers'
import { createDepartment, fetchAdminDepartments, updateDepartment } from '@/features/admin/catalogApi'
import { fetchStaff, updateStaffDepartment } from '@/features/admin/reportApi'
import { useAuth } from '@/features/auth/AuthProvider'
import { ApiError } from '@/services/api'
import { useToast } from '@/components/ui/Toast'

export function AdminDepartmentsPage() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const canManage = profile ? canManageCatalog(profile.role) : false
  const canManageUsers = profile ? canManageStaff(profile.role) : false
  const [items, setItems] = useState<CatalogItem[]>([])
  const [staff, setStaff] = useState<StaffOption[]>([])
  const [openUsersId, setOpenUsersId] = useState<string | null>(null)
  const [addingTo, setAddingTo] = useState<CatalogItem | null>(null)
  const [movingId, setMovingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const userCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const member of staff) {
      if (!member.department_id) continue
      counts[member.department_id] = (counts[member.department_id] ?? 0) + 1
    }
    return counts
  }, [staff])

  const refresh = useCallback(async () => {
    const departmentsResponse = await fetchAdminDepartments()
    setItems(departmentsResponse.departments)
    try {
      const staffResponse = await fetchStaff()
      setStaff(staffResponse.staff)
    } catch {
      setStaff([])
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    refresh()
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [refresh])

  async function removeFromDepartment(userId: string) {
    setMovingId(userId)
    try {
      const result = await updateStaffDepartment(userId, null)
      setStaff((current) =>
        current.map((entry) => (entry.user_id === userId ? result.staff : entry)),
      )
      toast({ variant: 'success', title: 'User removed from department' })
    } catch (caught) {
      toast({
        variant: 'error',
        title: 'Could not update user',
        description: caught instanceof ApiError ? caught.message : 'Try again.',
      })
    } finally {
      setMovingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">Departments</h1>
        <p className="mt-1 text-sm text-ink-500">
          Inactive departments stay on existing tickets but cannot receive new assignments. Pending is the number of
          tickets still open for that office. Open Users on a row to add staff who can receive assigned tickets.
          {canManage ? '' : ' Staff can view this list. Administrators manage the records.'}
        </p>
      </div>
      <CatalogManager
        noun="department"
        items={items}
        loading={loading}
        error={error}
        canManage={canManage}
        userCounts={userCounts}
        expandedId={openUsersId}
        onToggleUsers={(item) => setOpenUsersId((current) => (current === item.id ? null : item.id))}
        renderUsers={(item) => (
          <DepartmentUsersPanel
            department={item}
            staff={staff}
            canManage={canManageUsers}
            movingId={movingId}
            onAddUser={() => setAddingTo(item)}
            onRemoveUser={(userId) => void removeFromDepartment(userId)}
          />
        )}
        onCreate={async (input) => {
          const created = await createDepartment(input)
          setItems((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)))
          return created
        }}
        onUpdate={async (id, input) => {
          const updated = await updateDepartment(id, input)
          setItems((current) =>
            current.map((item) => (item.id === id ? updated : item)).sort((a, b) => a.name.localeCompare(b.name)),
          )
          return updated
        }}
      />
      <DepartmentUserDialogs
        department={addingTo}
        staff={staff}
        onClose={() => setAddingTo(null)}
        onStaffChange={setStaff}
      />
    </div>
  )
}
