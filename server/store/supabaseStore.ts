import { isAdminRole, type AdminRole } from '../../shared/auth.ts'
import type { AdminNoteItem, AdminReportDetail, AdminReportPhoto, AdminStatusHistoryItem } from '../../shared/adminReport.ts'
import {
  isGender,
  isReportPriority,
  isReportStatus,
  combinePersonName,
  currentManilaYear,
  formatTicketNumber,
  normalizePhilippineMobile,
  randomTicketSerial,
  type ReportPriority,
  type ReportStatus,
} from '../../shared/report.ts'
import { normalizeAccessPage } from '../../shared/map.ts'
import { buildAnalytics, reporterFingerprint } from '../lib/analytics.ts'
import {
  DepartmentNotFoundError,
  filterAdminReports,
  locationFrom,
  asCoordinate,
  paginateAdminReports,
  ReportNotFoundError,
  StaffNotFoundError,
  type AdminReportRecord,
} from '../lib/adminReports.ts'
import { aggregateAccessLogs, mapFilterAsListQuery } from '../lib/mapAccess.ts'
import { getSupabaseAdminClient } from '../lib/supabase.ts'
import { photoViewUrl, deletePhotoObject } from '../lib/spaces.ts'
import {
  CatalogItemNotFoundError,
  DuplicateCatalogNameError,
  LastActiveCategoryError,
} from '../lib/catalog.ts'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { CatalogItem } from '../../shared/catalog.ts'
import { hasDuplicateCatalogName } from '../../shared/catalog.ts'
import { logError } from '../lib/log.ts'
import { CategoryNotFoundError } from './localStore.ts'
import type { CreatedReport, ReportStore } from './types.ts'
import {
  asCreateReportInput,
  DuplicateFacebookIntakeError,
  FacebookIntakeNotConvertibleError,
  FacebookIntakeNotFoundError,
  normalizeFacebookImport,
  toFacebookIntakeItem,
} from '../lib/facebookIntake.ts'
import { FacebookOauthSessionError, type FacebookOauthPage } from '../lib/facebookConnection.ts'
import { isFacebookIntakeStatus, reportInputFromFacebookPreview } from '../../shared/facebookIntake.ts'

function asName(value: unknown): string | null {
  const relation = value as { name?: string } | { name?: string }[] | null
  if (Array.isArray(relation)) return relation[0]?.name ?? null
  return relation?.name ?? null
}

function asStatus(value: unknown): ReportStatus {
  return typeof value === 'string' && isReportStatus(value) ? value : 'submitted'
}

function asPriority(value: unknown): ReportPriority {
  return typeof value === 'string' && isReportPriority(value) ? value : 'medium'
}

function asGender(value: unknown) {
  return typeof value === 'string' && isGender(value) ? value : 'prefer_not_to_say'
}

function toCatalogRow(row: Record<string, unknown>, usageCount: number): CatalogItem {
  return {
    id: row.id as string,
    name: row.name as string,
    description: typeof row.description === 'string' ? row.description : null,
    is_active: row.is_active !== false,
    created_at: row.created_at as string,
    usage_count: usageCount,
  }
}

async function usageCounts(db: SupabaseClient, column: 'category_id' | 'assigned_department_id') {
  const { data, error } = await db.from('reports').select(column)
  const counts = new Map<string, number>()
  if (error) {
    logError('store', error)
    return counts
  }
  for (const row of data ?? []) {
    const id = (row as Record<string, unknown>)[column]
    if (typeof id === 'string') counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  return counts
}

function isUniqueViolation(error: { code?: string } | null) {
  return error?.code === '23505'
}

export function createSupabaseStore(): ReportStore | null {
  const adminClient = getSupabaseAdminClient()
  if (!adminClient) return null
  const db: SupabaseClient = adminClient

  async function profileNames(ids: string[]) {
    const unique = [...new Set(ids.filter(Boolean))]
    const names = new Map<string, string>()
    if (!unique.length) return names
    const { data, error } = await db.from('profiles').select('user_id, full_name').in('user_id', unique)
    if (error) {
      logError('store', error)
      return names
    }
    for (const row of data ?? []) {
      names.set(row.user_id as string, row.full_name as string)
    }
    return names
  }

  function toRecord(
    row: Record<string, unknown>,
    names: Map<string, string>,
  ): AdminReportRecord {
    const assignedAdminId = typeof row.assigned_admin_id === 'string' ? row.assigned_admin_id : null
    return {
      id: row.id as string,
      ticket_number: row.ticket_number as string,
      title: (row.title as string) ?? '',
      description: (row.description as string) ?? '',
      category_id: row.category_id as string,
      category_name: asName(row.report_categories) ?? 'Other',
      status: asStatus(row.status),
      priority: asPriority(row.priority),
      latitude: asCoordinate(row.latitude),
      longitude: asCoordinate(row.longitude),
      assigned_department_id: typeof row.assigned_department_id === 'string' ? row.assigned_department_id : null,
      assigned_department_name: asName(row.departments),
      assigned_admin_id: assignedAdminId,
      assigned_admin_name: assignedAdminId ? names.get(assignedAdminId) ?? null : null,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
    }
  }

  async function loadHistory(reportId: string): Promise<AdminStatusHistoryItem[]> {
    const { data, error } = await db
      .from('report_status_history')
      .select('id, previous_status, new_status, note, changed_by, created_at')
      .eq('report_id', reportId)
      .order('created_at', { ascending: true })

    if (error) {
      logError('store', error)
      return []
    }
    const rows = data ?? []
    const names = await profileNames(rows.map((row) => (typeof row.changed_by === 'string' ? row.changed_by : '')))
    return rows.map((row) => ({
      id: row.id as string,
      previous_status:
        typeof row.previous_status === 'string' && isReportStatus(row.previous_status) ? row.previous_status : null,
      new_status: asStatus(row.new_status),
      note: typeof row.note === 'string' ? row.note : null,
      actor_name: typeof row.changed_by === 'string' ? names.get(row.changed_by) ?? 'Administrator' : 'Resident',
      created_at: row.created_at as string,
    }))
  }

  async function loadNotes(reportId: string): Promise<AdminNoteItem[]> {
    const { data, error } = await db
      .from('report_notes')
      .select('id, note, admin_id, created_at')
      .eq('report_id', reportId)
      .order('created_at', { ascending: false })

    if (error) {
      logError('store', error)
      return []
    }
    const rows = data ?? []
    const names = await profileNames(rows.map((row) => (typeof row.admin_id === 'string' ? row.admin_id : '')))
    return rows.map((row) => ({
      id: row.id as string,
      note: row.note as string,
      actor_name: names.get(row.admin_id as string) ?? 'Administrator',
      created_at: row.created_at as string,
    }))
  }

  async function loadPhotos(reportId: string): Promise<AdminReportPhoto[]> {
    const { data, error } = await db
      .from('report_attachments')
      .select('id, storage_key, content_type, byte_size, sort_order')
      .eq('report_id', reportId)
      .order('sort_order', { ascending: true })

    if (error) {
      logError('store', error)
      return []
    }

    const photos: AdminReportPhoto[] = []
    for (const row of data ?? []) {
      const key = typeof row.storage_key === 'string' ? row.storage_key : ''
      const url = await photoViewUrl(key)
      if (!url) continue
      photos.push({
        id: row.id as string,
        url,
        content_type: typeof row.content_type === 'string' ? row.content_type : 'image/jpeg',
        byte_size: Number(row.byte_size) || 0,
      })
    }
    return photos
  }

  async function loadDetail(ticketNumber: string): Promise<AdminReportDetail> {
    const { data, error } = await db
      .from('reports')
      .select(
        'id, ticket_number, title, description, status, priority, created_at, updated_at, latitude, longitude, location_accuracy, location_captured_at, assigned_department_id, assigned_admin_id, category_id, full_name, birth_date, gender, address, phone, email, report_categories ( name ), departments ( name )',
      )
      .eq('ticket_number', ticketNumber)
      .maybeSingle()

    if (error) {
      logError('store', error)
      throw new Error('STORAGE_UNAVAILABLE')
    }
    if (!data) throw new ReportNotFoundError()

    const names = await profileNames(typeof data.assigned_admin_id === 'string' ? [data.assigned_admin_id] : [])
    const record = toRecord(data as Record<string, unknown>, names)
    const [history, notes, photos] = await Promise.all([
      loadHistory(record.id),
      loadNotes(record.id),
      loadPhotos(record.id),
    ])

    return {
      id: record.id,
      ticket_number: record.ticket_number,
      title: record.title,
      description: record.description,
      category_id: record.category_id,
      category_name: record.category_name,
      status: record.status,
      priority: record.priority,
      reporter: {
        full_name: data.full_name as string,
        birth_date: data.birth_date as string,
        gender: asGender(data.gender),
        address: data.address as string,
        phone: data.phone as string,
        email: (data.email as string | null) ?? null,
      },
      location: locationFrom({
        latitude: record.latitude,
        longitude: record.longitude,
        location_accuracy: asCoordinate(data.location_accuracy),
        location_captured_at: typeof data.location_captured_at === 'string' ? data.location_captured_at : null,
      }),
      assigned_department_id: record.assigned_department_id,
      assigned_department_name: record.assigned_department_name,
      assigned_admin_id: record.assigned_admin_id,
      assigned_admin_name: record.assigned_admin_name,
      created_at: record.created_at,
      updated_at: record.updated_at,
      history,
      notes,
      photos,
    }
  }

  return {
    mode: 'supabase',

    async listPublicCategories() {
      const { data, error } = await db
        .from('report_categories')
        .select('id, name, description')
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (error) {
        logError('store', error)
        throw new Error('STORAGE_UNAVAILABLE')
      }

      return (data ?? []).map((row) => ({
        id: row.id as string,
        name: row.name as string,
        description: (row.description as string | null) ?? null,
      }))
    },

    async createReport(input) {
      const { data: category, error: categoryError } = await db
        .from('report_categories')
        .select('id, name, is_active')
        .eq('id', input.category_id)
        .maybeSingle()

      if (categoryError) {
        logError('store', categoryError)
        throw new Error('STORAGE_UNAVAILABLE')
      }
      if (!category || category.is_active === false) {
        throw new CategoryNotFoundError()
      }

      const now = new Date().toISOString()
      const location = input.location ?? null
      const insertPayload = {
        full_name: combinePersonName(input.first_name, input.last_name),
        birth_date: input.birth_date,
        gender: input.gender,
        address: input.address.trim(),
        phone: normalizePhilippineMobile(input.phone),
        email: input.email?.trim() ? input.email.trim() : null,
        category_id: category.id,
        title: input.title.trim(),
        description: input.description.trim(),
        status: 'submitted',
        priority: 'medium',
        latitude: location?.latitude ?? null,
        longitude: location?.longitude ?? null,
        location_accuracy: location?.accuracy ?? null,
        location_captured_at: location?.timestamp ?? null,
        created_at: now,
        updated_at: now,
      }

      let report: { id: string; ticket_number: string; created_at: string } | null = null
      const year = currentManilaYear()
      for (let attempt = 0; attempt < 8; attempt++) {
        const ticketNumber = formatTicketNumber(year, randomTicketSerial())
        const { data, error: insertError } = await db
          .from('reports')
          .insert({ ...insertPayload, ticket_number: ticketNumber })
          .select('id, ticket_number, created_at')
          .single()

        if (!insertError && data) {
          report = data as { id: string; ticket_number: string; created_at: string }
          break
        }
        if (insertError?.code === '23505') continue
        logError('store', insertError)
        throw new Error('STORAGE_UNAVAILABLE')
      }

      if (!report) {
        throw new Error('STORAGE_UNAVAILABLE')
      }

      const { error: historyError } = await db.from('report_status_history').insert({
        report_id: report.id,
        previous_status: null,
        new_status: 'submitted',
        note: 'Report submitted by a resident.',
        changed_by: null,
        created_at: now,
      })

      if (historyError) {
        logError('store', historyError)
      }

      const photos = input.photos ?? []
      if (photos.length > 0) {
        const { error: photoError } = await db.from('report_attachments').insert(
          photos.map((photo, index) => ({
            report_id: report.id,
            storage_key: photo.key,
            content_type: photo.content_type,
            byte_size: photo.byte_size,
            sort_order: index,
            created_at: now,
          })),
        )
        if (photoError) {
          logError('store', photoError)
        }
      }

      const created: CreatedReport = {
        id: report.id as string,
        ticket_number: report.ticket_number as string,
        status: 'submitted',
        created_at: report.created_at as string,
        category_name: category.name as string,
      }
      return created
    },

    async findPublicByTicket(ticketNumber) {
      const { data, error } = await db
        .from('reports')
        .select('ticket_number, status, created_at, updated_at, report_categories ( name )')
        .eq('ticket_number', ticketNumber)
        .maybeSingle()

      if (error) {
        logError('store', error)
        throw new Error('STORAGE_UNAVAILABLE')
      }
      if (!data) return null

      return {
        ticket_number: data.ticket_number as string,
        status: asStatus(data.status),
        category_name: asName(data.report_categories) ?? 'Other',
        created_at: data.created_at as string,
        updated_at: data.updated_at as string,
      }
    },

    async getAnalytics(query) {
      const { data, error } = await db
        .from('reports')
        .select('status, phone, created_at, latitude, longitude, gender, birth_date, assigned_department_id, report_categories ( name ), departments ( name )')

      if (error) {
        logError('store', error)
        throw new Error('STORAGE_UNAVAILABLE')
      }

      const rows = (data ?? []).map((row) => {
        const phone = typeof row.phone === 'string' ? row.phone : ''
        return {
          status: asStatus(row.status),
          categoryName: asName(row.report_categories) ?? 'Other',
          departmentName: asName(row.departments),
          reporterKey: reporterFingerprint(phone),
          createdAt: row.created_at as string,
          latitude: asCoordinate(row.latitude),
          longitude: asCoordinate(row.longitude),
          gender: typeof row.gender === 'string' ? row.gender : null,
          birthDate: typeof row.birth_date === 'string' ? row.birth_date : null,
        }
      })
      return buildAnalytics(rows, query)
    },

    async listAdminReports(query) {
      const { data, error } = await db
        .from('reports')
        .select(
          'id, ticket_number, title, description, status, priority, created_at, updated_at, latitude, longitude, assigned_department_id, assigned_admin_id, category_id, report_categories ( name ), departments ( name )',
        )

      if (error) {
        logError('store', error)
        throw new Error('STORAGE_UNAVAILABLE')
      }

      const rows = data ?? []
      const names = await profileNames(
        rows.map((row) => (typeof row.assigned_admin_id === 'string' ? row.assigned_admin_id : '')),
      )
      return paginateAdminReports(
        rows.map((row) => toRecord(row as Record<string, unknown>, names)),
        query,
      )
    },

    async getAdminReport(ticketNumber) {
      try {
        return await loadDetail(ticketNumber)
      } catch (error) {
        if (error instanceof ReportNotFoundError) return null
        throw error
      }
    },

    async updateReportStatus(ticketNumber, input, actor) {
      const current = await loadDetail(ticketNumber)
      const now = new Date().toISOString()
      const { error: updateError } = await db
        .from('reports')
        .update({ status: input.status, updated_at: now })
        .eq('id', current.id)

      if (updateError) {
        logError('store', updateError)
        throw new Error('STORAGE_UNAVAILABLE')
      }

      const { error: historyError } = await db.from('report_status_history').insert({
        report_id: current.id,
        previous_status: current.status,
        new_status: input.status,
        note: input.note?.trim() ? input.note.trim() : null,
        changed_by: actor.userId,
        created_at: now,
      })
      if (historyError) logError('store', historyError)
      return loadDetail(ticketNumber)
    },

    async updateReportPriority(ticketNumber, input, _actor) {
      const current = await loadDetail(ticketNumber)
      const { error } = await db
        .from('reports')
        .update({ priority: input.priority, updated_at: new Date().toISOString() })
        .eq('id', current.id)
      if (error) {
        logError('store', error)
        throw new Error('STORAGE_UNAVAILABLE')
      }
      return loadDetail(ticketNumber)
    },

    async assignReport(ticketNumber, input, _actor) {
      const current = await loadDetail(ticketNumber)
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }

      if (input.department_id !== undefined) {
        if (input.department_id === null) {
          patch.assigned_department_id = null
        } else {
          const { data: department, error } = await db
            .from('departments')
            .select('id, is_active')
            .eq('id', input.department_id)
            .maybeSingle()
          if (error) {
            logError('store', error)
            throw new Error('STORAGE_UNAVAILABLE')
          }
          if (!department || department.is_active === false) throw new DepartmentNotFoundError()
          patch.assigned_department_id = department.id
        }
      }

      if (input.admin_id !== undefined) {
        if (input.admin_id === null) {
          patch.assigned_admin_id = null
        } else {
          const { data: profile, error } = await db
            .from('profiles')
            .select('user_id, role')
            .eq('user_id', input.admin_id)
            .maybeSingle()
          if (error) {
            logError('store', error)
            throw new Error('STORAGE_UNAVAILABLE')
          }
          const role = typeof profile?.role === 'string' ? profile.role : ''
          if (!profile || !isAdminRole(role)) throw new StaffNotFoundError()
          patch.assigned_admin_id = profile.user_id
        }
      }

      const { error: updateError } = await db.from('reports').update(patch).eq('id', current.id)
      if (updateError) {
        logError('store', updateError)
        throw new Error('STORAGE_UNAVAILABLE')
      }
      return loadDetail(ticketNumber)
    },

    async addReportNote(ticketNumber, note, actor) {
      const current = await loadDetail(ticketNumber)
      const now = new Date().toISOString()
      const { error } = await db.from('report_notes').insert({
        report_id: current.id,
        admin_id: actor.userId,
        note,
        created_at: now,
      })
      if (error) {
        logError('store', error)
        throw new Error('STORAGE_UNAVAILABLE')
      }
      await db.from('reports').update({ updated_at: now }).eq('id', current.id)
      return loadDetail(ticketNumber)
    },

    async deleteReport(ticketNumber, _actor) {
      const current = await loadDetail(ticketNumber)
      const { data: attachments, error: attachmentError } = await db
        .from('report_attachments')
        .select('storage_key')
        .eq('report_id', current.id)
      if (attachmentError) {
        logError('store', attachmentError)
        throw new Error('STORAGE_UNAVAILABLE')
      }
      for (const row of attachments ?? []) {
        if (typeof row.storage_key === 'string') await deletePhotoObject(row.storage_key)
      }
      const { error } = await db.from('reports').delete().eq('id', current.id)
      if (error) {
        logError('store', error)
        throw new Error('STORAGE_UNAVAILABLE')
      }
    },

    async listAdminCategories() {
      const [{ data, error }, usage] = await Promise.all([
        db.from('report_categories').select('id, name, description, is_active, created_at').order('name'),
        usageCounts(db, 'category_id'),
      ])
      if (error) {
        logError('store', error)
        throw new Error('STORAGE_UNAVAILABLE')
      }
      return (data ?? []).map((row) => toCatalogRow(row, usage.get(row.id as string) ?? 0))
    },

    async createCategory(input) {
      const { data: existing, error: existingError } = await db
        .from('report_categories')
        .select('id, name')
      if (existingError) {
        logError('store', existingError)
        throw new Error('STORAGE_UNAVAILABLE')
      }
      if (hasDuplicateCatalogName(existing ?? [], input.name)) {
        throw new DuplicateCatalogNameError('category')
      }
      const { data, error } = await db
        .from('report_categories')
        .insert({
          name: input.name,
          description: input.description,
          is_active: input.is_active,
        })
        .select('id, name, description, is_active, created_at')
        .single()
      if (error || !data) {
        if (isUniqueViolation(error)) throw new DuplicateCatalogNameError('category')
        logError('store', error)
        throw new Error('STORAGE_UNAVAILABLE')
      }
      return toCatalogRow(data, 0)
    },

    async updateCategory(id, input) {
      const { data: current, error: currentError } = await db
        .from('report_categories')
        .select('id, name, description, is_active, created_at')
        .eq('id', id)
        .maybeSingle()
      if (currentError) {
        logError('store', currentError)
        throw new Error('STORAGE_UNAVAILABLE')
      }
      if (!current) throw new CatalogItemNotFoundError('category')

      if (input.name !== undefined) {
        const { data: names, error: namesError } = await db.from('report_categories').select('id, name')
        if (namesError) {
          logError('store', namesError)
          throw new Error('STORAGE_UNAVAILABLE')
        }
        if (hasDuplicateCatalogName(names ?? [], input.name, id)) {
          throw new DuplicateCatalogNameError('category')
        }
      }

      if (input.is_active === false && current.is_active !== false) {
        const { data: active, error: activeError } = await db
          .from('report_categories')
          .select('id')
          .eq('is_active', true)
          .neq('id', id)
        if (activeError) {
          logError('store', activeError)
          throw new Error('STORAGE_UNAVAILABLE')
        }
        if (!active?.length) throw new LastActiveCategoryError()
      }

      const { data, error } = await db
        .from('report_categories')
        .update({
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.is_active !== undefined ? { is_active: input.is_active } : {}),
        })
        .eq('id', id)
        .select('id, name, description, is_active, created_at')
        .single()
      if (error || !data) {
        if (isUniqueViolation(error)) throw new DuplicateCatalogNameError('category')
        logError('store', error)
        throw new Error('STORAGE_UNAVAILABLE')
      }
      const usage = await usageCounts(db, 'category_id')
      return toCatalogRow(data, usage.get(id) ?? 0)
    },

    async listDepartments() {
      const [{ data, error }, usage] = await Promise.all([
        db.from('departments').select('id, name, description, is_active, created_at').order('name'),
        usageCounts(db, 'assigned_department_id'),
      ])
      if (error) {
        logError('store', error)
        throw new Error('STORAGE_UNAVAILABLE')
      }
      return (data ?? []).map((row) => toCatalogRow(row, usage.get(row.id as string) ?? 0))
    },

    async createDepartment(input) {
      const { data: existing, error: existingError } = await db.from('departments').select('id, name')
      if (existingError) {
        logError('store', existingError)
        throw new Error('STORAGE_UNAVAILABLE')
      }
      if (hasDuplicateCatalogName(existing ?? [], input.name)) {
        throw new DuplicateCatalogNameError('department')
      }
      const { data, error } = await db
        .from('departments')
        .insert({
          name: input.name,
          description: input.description,
          is_active: input.is_active,
        })
        .select('id, name, description, is_active, created_at')
        .single()
      if (error || !data) {
        if (isUniqueViolation(error)) throw new DuplicateCatalogNameError('department')
        logError('store', error)
        throw new Error('STORAGE_UNAVAILABLE')
      }
      return toCatalogRow(data, 0)
    },

    async updateDepartment(id, input) {
      const { data: current, error: currentError } = await db
        .from('departments')
        .select('id, name, description, is_active, created_at')
        .eq('id', id)
        .maybeSingle()
      if (currentError) {
        logError('store', currentError)
        throw new Error('STORAGE_UNAVAILABLE')
      }
      if (!current) throw new CatalogItemNotFoundError('department')

      if (input.name !== undefined) {
        const { data: names, error: namesError } = await db.from('departments').select('id, name')
        if (namesError) {
          logError('store', namesError)
          throw new Error('STORAGE_UNAVAILABLE')
        }
        if (hasDuplicateCatalogName(names ?? [], input.name, id)) {
          throw new DuplicateCatalogNameError('department')
        }
      }

      const { data, error } = await db
        .from('departments')
        .update({
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.is_active !== undefined ? { is_active: input.is_active } : {}),
        })
        .eq('id', id)
        .select('id, name, description, is_active, created_at')
        .single()
      if (error || !data) {
        if (isUniqueViolation(error)) throw new DuplicateCatalogNameError('department')
        logError('store', error)
        throw new Error('STORAGE_UNAVAILABLE')
      }
      const usage = await usageCounts(db, 'assigned_department_id')
      return toCatalogRow(data, usage.get(id) ?? 0)
    },

    async listStaff() {
      const { data, error } = await db.from('profiles').select('user_id, full_name, role').order('full_name')
      if (error) {
        logError('store', error)
        throw new Error('STORAGE_UNAVAILABLE')
      }
      return (data ?? [])
        .filter((row) => isAdminRole(typeof row.role === 'string' ? row.role : ''))
        .map((row) => ({
          user_id: row.user_id as string,
          full_name: row.full_name as string,
          role: row.role as AdminRole,
        }))
    },

    async createAccessLog(input) {
      const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString()
      const { data: existing, error: existingError } = await db
        .from('access_logs')
        .select('id')
        .eq('session_id', input.session_id)
        .gte('created_at', cutoff)
        .limit(1)
      if (existingError) {
        logError('store', existingError)
        throw new Error('STORAGE_UNAVAILABLE')
      }
      if (existing && existing.length > 0) return

      const { error } = await db.from('access_logs').insert({
        session_id: input.session_id,
        latitude: input.latitude,
        longitude: input.longitude,
        accuracy: input.accuracy ?? null,
        page: normalizeAccessPage(input.page),
        user_agent: input.user_agent,
        created_at: new Date().toISOString(),
      })
      if (error) {
        logError('store', error)
        throw new Error('STORAGE_UNAVAILABLE')
      }
    },

    async listMapReports(query) {
      const { data, error } = await db
        .from('reports')
        .select(
          'id, ticket_number, title, description, status, priority, created_at, updated_at, latitude, longitude, assigned_department_id, assigned_admin_id, category_id, report_categories ( name ), departments ( name )',
        )
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)

      if (error) {
        logError('store', error)
        throw new Error('STORAGE_UNAVAILABLE')
      }

      const rows = data ?? []
      const names = await profileNames(
        rows.map((row) => (typeof row.assigned_admin_id === 'string' ? row.assigned_admin_id : '')),
      )
      return filterAdminReports(
        rows.map((row) => toRecord(row as Record<string, unknown>, names)),
        mapFilterAsListQuery(query),
      )
        .filter((record) => record.latitude != null && record.longitude != null)
        .map((record) => ({
          ticket_number: record.ticket_number,
          category_name: record.category_name,
          status: record.status,
          priority: record.priority,
          created_at: record.created_at,
          latitude: record.latitude as number,
          longitude: record.longitude as number,
        }))
    },

    async listMapAccess(query) {
      const { data, error } = await db.from('access_logs').select('latitude, longitude, created_at')
      if (error) {
        logError('store', error)
        throw new Error('STORAGE_UNAVAILABLE')
      }
      return aggregateAccessLogs(
        (data ?? []).map((row) => ({
          latitude: Number(row.latitude),
          longitude: Number(row.longitude),
          createdAt: row.created_at as string,
        })),
        query,
      )
    },

    async listFacebookIntakes(status) {
      let request = db
        .from('facebook_intakes')
        .select(
          'id, facebook_post_id, facebook_comment_id, permalink, author_name, message, posted_at, kind, status, ticket_number, imported_by_name, created_at',
        )
        .order('created_at', { ascending: false })
      if (status && isFacebookIntakeStatus(status)) request = request.eq('status', status)
      const { data, error } = await request
      if (error) {
        logError('store', error)
        throw new Error('STORAGE_UNAVAILABLE')
      }
      return (data ?? []).map((row) => toFacebookIntakeItem(row))
    },

    async createFacebookIntake(input, actor) {
      const payload = normalizeFacebookImport(input)
      const { data, error } = await db
        .from('facebook_intakes')
        .insert({
          facebook_post_id: payload.facebook_post_id,
          facebook_comment_id: payload.facebook_comment_id,
          permalink: payload.permalink,
          author_name: payload.author_name,
          message: payload.message,
          posted_at: payload.posted_at,
          kind: payload.kind,
          status: 'new',
          imported_by: actor.userId,
          imported_by_name: actor.fullName,
        })
        .select(
          'id, facebook_post_id, facebook_comment_id, permalink, author_name, message, posted_at, kind, status, ticket_number, imported_by_name, created_at',
        )
        .single()
      if (isUniqueViolation(error)) throw new DuplicateFacebookIntakeError()
      if (error || !data) {
        logError('store', error)
        throw new Error('STORAGE_UNAVAILABLE')
      }
      return toFacebookIntakeItem(data)
    },

    async convertFacebookIntake(id, input, actor) {
      const { data: existing, error: existingError } = await db
        .from('facebook_intakes')
        .select(
          'id, facebook_post_id, facebook_comment_id, permalink, author_name, message, posted_at, kind, status, ticket_number, imported_by_name, created_at',
        )
        .eq('id', id)
        .maybeSingle()
      if (existingError) {
        logError('store', existingError)
        throw new Error('STORAGE_UNAVAILABLE')
      }
      if (!existing) throw new FacebookIntakeNotFoundError()
      if (existing.status !== 'new') throw new FacebookIntakeNotConvertibleError()

      const created = await this.createReport(asCreateReportInput(input))
      const now = new Date().toISOString()
      const { error: noteError } = await db.from('report_notes').insert({
        report_id: created.id,
        admin_id: actor.userId,
        note: `Facebook ${existing.kind}: ${existing.permalink}`,
        created_at: now,
      })
      if (noteError) logError('store', noteError)

      const { data, error } = await db
        .from('facebook_intakes')
        .update({
          status: 'converted',
          report_id: created.id,
          ticket_number: created.ticket_number,
        })
        .eq('id', id)
        .eq('status', 'new')
        .select(
          'id, facebook_post_id, facebook_comment_id, permalink, author_name, message, posted_at, kind, status, ticket_number, imported_by_name, created_at',
        )
        .maybeSingle()
      if (error) {
        logError('store', error)
        throw new Error('STORAGE_UNAVAILABLE')
      }
      if (!data) throw new FacebookIntakeNotConvertibleError()
      return toFacebookIntakeItem(data)
    },

    async dismissFacebookIntake(id, _actor) {
      const { data: existing, error: existingError } = await db
        .from('facebook_intakes')
        .select('id, status')
        .eq('id', id)
        .maybeSingle()
      if (existingError) {
        logError('store', existingError)
        throw new Error('STORAGE_UNAVAILABLE')
      }
      if (!existing) throw new FacebookIntakeNotFoundError()
      if (existing.status !== 'new') throw new FacebookIntakeNotConvertibleError()

      const { data, error } = await db
        .from('facebook_intakes')
        .update({ status: 'dismissed' })
        .eq('id', id)
        .eq('status', 'new')
        .select(
          'id, facebook_post_id, facebook_comment_id, permalink, author_name, message, posted_at, kind, status, ticket_number, imported_by_name, created_at',
        )
        .maybeSingle()
      if (error) {
        logError('store', error)
        throw new Error('STORAGE_UNAVAILABLE')
      }
      if (!data) throw new FacebookIntakeNotConvertibleError()
      return toFacebookIntakeItem(data)
    },

    async importFacebookPreviewsAsReports(items, categoryId, actor) {
      if (items.length === 0) {
        return { created: 0, skipped: 0, comment_count: 0, intakes: [] }
      }
      const postIds = [...new Set(items.map((item) => item.facebook_post_id))]
      const { data: existingRows, error: existingError } = await db
        .from('facebook_intakes')
        .select(
          'id, facebook_post_id, facebook_comment_id, permalink, author_name, message, posted_at, kind, status, ticket_number, imported_by_name, created_at',
        )
        .in('facebook_post_id', postIds)
      if (existingError) {
        logError('store', existingError)
        throw new Error('STORAGE_UNAVAILABLE')
      }
      const existingByKey = new Map(
        (existingRows ?? []).map((row) => [`${row.facebook_post_id}:${row.facebook_comment_id ?? ''}`, row]),
      )
      let created = 0
      let skipped = 0
      const intakes = []
      for (const item of items) {
        const key = `${item.facebook_post_id}:${item.facebook_comment_id ?? ''}`
        const existing = existingByKey.get(key)
        if (existing && existing.status !== 'new') {
          skipped += 1
          continue
        }
        const payload = reportInputFromFacebookPreview(item, categoryId)
        if (existing) {
          const converted = await this.convertFacebookIntake(existing.id, payload, actor)
          created += 1
          intakes.push(converted)
          existingByKey.set(key, converted)
          continue
        }
        try {
          const intake = await this.createFacebookIntake(
            {
              facebook_post_id: item.facebook_post_id,
              facebook_comment_id: item.facebook_comment_id,
              permalink: item.permalink,
              author_name: item.author_name,
              message: item.message.trim() || 'Facebook comment',
              posted_at: item.posted_at,
              kind: item.kind,
            },
            actor,
          )
          const converted = await this.convertFacebookIntake(intake.id, payload, actor)
          created += 1
          intakes.push(converted)
          existingByKey.set(key, converted)
        } catch (error) {
          if (error instanceof DuplicateFacebookIntakeError) {
            skipped += 1
            continue
          }
          throw error
        }
      }
      return {
        created,
        skipped,
        comment_count: items.filter((item) => item.kind === 'comment').length,
        intakes,
      }
    },

    async getFacebookConnection() {
      const { data, error } = await db
        .from('facebook_connections')
        .select('page_id, page_name, access_token')
        .eq('is_active', true)
        .maybeSingle()
      if (error) {
        if (error.code === 'PGRST205') return null
        logError('store', error)
        throw new Error('STORAGE_UNAVAILABLE')
      }
      if (!data?.access_token || !data.page_id) return null
      return {
        page_id: data.page_id as string,
        page_name: (data.page_name as string) || data.page_id,
        access_token: data.access_token as string,
      }
    },

    async saveFacebookConnection(input, actor) {
      const now = new Date().toISOString()
      const { error: clearError } = await db.from('facebook_connections').update({ is_active: false, updated_at: now })
      if (clearError) {
        logError('store', clearError)
        throw new Error('STORAGE_UNAVAILABLE')
      }
      const { data, error } = await db
        .from('facebook_connections')
        .upsert(
          {
            page_id: input.page_id,
            page_name: input.page_name,
            access_token: input.access_token,
            is_active: true,
            connected_by: actor.userId,
            connected_by_name: actor.fullName,
            updated_at: now,
          },
          { onConflict: 'page_id' },
        )
        .select('page_id, page_name')
        .single()
      if (error || !data) {
        logError('store', error)
        throw new Error('STORAGE_UNAVAILABLE')
      }
      return { page_id: data.page_id as string, page_name: data.page_name as string }
    },

    async deleteFacebookConnection() {
      const { error } = await db.from('facebook_connections').update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      if (error) {
        logError('store', error)
        throw new Error('STORAGE_UNAVAILABLE')
      }
    },

    async createFacebookOauthSession(adminUserId, state, expiresAt) {
      await db.from('facebook_oauth_sessions').delete().lt('expires_at', new Date().toISOString())
      const { data, error } = await db
        .from('facebook_oauth_sessions')
        .insert({
          state,
          admin_user_id: adminUserId,
          expires_at: expiresAt,
        })
        .select('id, state, admin_user_id, pages, expires_at')
        .single()
      if (error || !data) {
        logError('store', error)
        throw new Error('STORAGE_UNAVAILABLE')
      }
      return {
        id: data.id as string,
        state: data.state as string,
        admin_user_id: data.admin_user_id as string,
        pages: null,
        expires_at: data.expires_at as string,
      }
    },

    async getFacebookOauthSession(state, adminUserId) {
      const { data, error } = await db
        .from('facebook_oauth_sessions')
        .select('id, state, admin_user_id, pages, expires_at')
        .eq('state', state)
        .eq('admin_user_id', adminUserId)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle()
      if (error) {
        logError('store', error)
        throw new Error('STORAGE_UNAVAILABLE')
      }
      if (!data) return null
      return {
        id: data.id as string,
        state: data.state as string,
        admin_user_id: data.admin_user_id as string,
        pages: Array.isArray(data.pages) ? (data.pages as FacebookOauthPage[]) : null,
        expires_at: data.expires_at as string,
      }
    },

    async saveFacebookOauthPages(sessionId, pages) {
      const { data, error } = await db
        .from('facebook_oauth_sessions')
        .update({ pages })
        .eq('id', sessionId)
        .gt('expires_at', new Date().toISOString())
        .select('id, state, admin_user_id, pages, expires_at')
        .maybeSingle()
      if (error) {
        logError('store', error)
        throw new Error('STORAGE_UNAVAILABLE')
      }
      if (!data) throw new FacebookOauthSessionError()
      return {
        id: data.id as string,
        state: data.state as string,
        admin_user_id: data.admin_user_id as string,
        pages,
        expires_at: data.expires_at as string,
      }
    },

    async getFacebookOauthSessionById(id, adminUserId) {
      const { data, error } = await db
        .from('facebook_oauth_sessions')
        .select('id, state, admin_user_id, pages, expires_at')
        .eq('id', id)
        .eq('admin_user_id', adminUserId)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle()
      if (error) {
        logError('store', error)
        throw new Error('STORAGE_UNAVAILABLE')
      }
      if (!data) return null
      return {
        id: data.id as string,
        state: data.state as string,
        admin_user_id: data.admin_user_id as string,
        pages: Array.isArray(data.pages) ? (data.pages as FacebookOauthPage[]) : null,
        expires_at: data.expires_at as string,
      }
    },

    async deleteFacebookOauthSession(id) {
      const { error } = await db.from('facebook_oauth_sessions').delete().eq('id', id)
      if (error) {
        logError('store', error)
        throw new Error('STORAGE_UNAVAILABLE')
      }
    },
  }
}
