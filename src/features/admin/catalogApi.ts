import type { CatalogItem, CatalogCreateInput, CatalogUpdateInput } from '@shared/catalog'
import { api } from '@/services/api'

export function fetchAdminCategories() {
  return api.get<{ categories: CatalogItem[] }>('/admin/categories')
}

export function createCategory(input: CatalogCreateInput) {
  return api.post<CatalogItem>('/admin/categories', input)
}

export function updateCategory(id: string, input: CatalogUpdateInput) {
  return api.patch<CatalogItem>(`/admin/categories/${encodeURIComponent(id)}`, input)
}

export function fetchAdminDepartments() {
  return api.get<{ departments: CatalogItem[] }>('/admin/departments')
}

export function createDepartment(input: CatalogCreateInput) {
  return api.post<CatalogItem>('/admin/departments', input)
}

export function updateDepartment(id: string, input: CatalogUpdateInput) {
  return api.patch<CatalogItem>(`/admin/departments/${encodeURIComponent(id)}`, input)
}

export function catalogDisplayName(item: { name: string; is_active: boolean }) {
  return item.is_active ? item.name : `${item.name} (inactive)`
}
