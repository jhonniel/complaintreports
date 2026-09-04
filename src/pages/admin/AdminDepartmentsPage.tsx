import { useCallback, useEffect, useState } from 'react'
import type { CatalogItem } from '@shared/catalog'
import { canManageCatalog } from '@shared/auth'
import { CatalogManager } from '@/features/admin/CatalogManager'
import { createDepartment, fetchAdminDepartments, updateDepartment } from '@/features/admin/catalogApi'
import { useAuth } from '@/features/auth/AuthProvider'
import { ApiError } from '@/services/api'

export function AdminDepartmentsPage() {
  const { profile } = useAuth()
  const canManage = profile ? canManageCatalog(profile.role) : false
  const [items, setItems] = useState<CatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const response = await fetchAdminDepartments()
    setItems(response.departments)
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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl font-semibold">Departments</h1>
        <p className="mt-1 text-sm text-ink-500">
          Inactive departments stay on existing tickets but cannot receive new assignments. Pending is the number of
          tickets still open for that office.
          {canManage ? '' : ' Staff can view this list. Administrators manage the records.'}
        </p>
      </div>
      <CatalogManager
        noun="department"
        items={items}
        loading={loading}
        error={error}
        canManage={canManage}
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
    </div>
  )
}
