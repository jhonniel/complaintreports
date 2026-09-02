import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type {
  AdminActorRef,
  AdminNoteItem,
  AdminReportDetail,
  AdminStatusHistoryItem,
} from '../../shared/adminReport.ts'
import { isAdminRole } from '../../shared/auth.ts'
import { DEFAULT_CATEGORIES } from '../../shared/categories.ts'
import type { CatalogCreateInput, CatalogItem, CatalogUpdateInput } from '../../shared/catalog.ts'
import { hasDuplicateCatalogName } from '../../shared/catalog.ts'
import { DEFAULT_DEPARTMENTS } from '../../shared/departments.ts'
import { normalizeAccessPage } from '../../shared/map.ts'
import {
  currentManilaYear,
  formatTicketNumber,
  isGender,
  isReportPriority,
  isReportStatus,
  normalizePhilippineMobile,
  type ReportPriority,
  type ReportStatus,
} from '../../shared/report.ts'
import { buildAnalytics, reporterFingerprint } from '../lib/analytics.ts'
import {
  DepartmentNotFoundError,
  filterAdminReports,
  locationFrom,
  paginateAdminReports,
  ReportNotFoundError,
  StaffNotFoundError,
  type AdminReportRecord,
} from '../lib/adminReports.ts'
import {
  CatalogItemNotFoundError,
  DuplicateCatalogNameError,
  LastActiveCategoryError,
} from '../lib/catalog.ts'
import { aggregateAccessLogs, mapFilterAsListQuery } from '../lib/mapAccess.ts'
import type { CreatedReport, ReportStore } from './types.ts'

interface LocalCategory {
  id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
}

interface LocalDepartment {
  id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
}

interface LocalStaff {
  user_id: string
  full_name: string
  role: string
}

interface LocalReport {
  id: string
  ticket_number: string
  full_name: string
  birth_date: string
  gender: string
  address: string
  phone: string
  email: string | null
  category_id: string
  title: string
  description: string
  status: string
  priority: string
  latitude: number | null
  longitude: number | null
  location_accuracy: number | null
  location_captured_at: string | null
  assigned_department_id: string | null
  assigned_admin_id: string | null
  assigned_admin_name?: string | null
  created_at: string
  updated_at: string
}

interface LocalStatusHistory {
  id: string
  report_id: string
  previous_status: string | null
  new_status: string
  note: string | null
  changed_by: string | null
  changed_by_name?: string | null
  created_at: string
}

interface LocalNote {
  id: string
  report_id: string
  admin_id: string
  admin_name: string
  note: string
  created_at: string
}

interface LocalAccessLog {
  id: string
  session_id: string
  latitude: number
  longitude: number
  accuracy: number | null
  page: string
  user_agent: string | null
  created_at: string
}

interface LocalDatabase {
  ticketCounters: Record<string, number>
  categories: LocalCategory[]
  departments: LocalDepartment[]
  staff: LocalStaff[]
  reports: LocalReport[]
  statusHistory: LocalStatusHistory[]
  notes: LocalNote[]
  accessLogs: LocalAccessLog[]
}

const dataDir = path.join(process.cwd(), 'server', 'data')
const dataFile = path.join(dataDir, 'local-store.json')

let writeQueue: Promise<unknown> = Promise.resolve()

function withLock<T>(work: () => Promise<T>) {
  const run = writeQueue.then(work, work)
  writeQueue = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

function emptyDatabase(): LocalDatabase {
  const now = new Date().toISOString()
  return {
    ticketCounters: {},
    categories: DEFAULT_CATEGORIES.map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description,
      is_active: true,
      created_at: now,
    })),
    departments: DEFAULT_DEPARTMENTS.map((department) => ({
      id: department.id,
      name: department.name,
      description: department.description,
      is_active: true,
      created_at: now,
    })),
    staff: [],
    reports: [],
    statusHistory: [],
    notes: [],
    accessLogs: seedAccessLogs(),
  }
}

function seedAccessLogs(): LocalAccessLog[] {
  const now = new Date().toISOString()
  return [
    {
      id: 'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
      session_id: 'session-demo-access-001',
      latitude: 7.0083,
      longitude: 125.0894,
      accuracy: 25,
      page: '/',
      user_agent: null,
      created_at: now,
    },
    {
      id: 'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
      session_id: 'session-demo-access-002',
      latitude: 7.0081,
      longitude: 125.0896,
      accuracy: 40,
      page: '/submit',
      user_agent: null,
      created_at: now,
    },
    {
      id: 'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
      session_id: 'session-demo-access-003',
      latitude: 7.0152,
      longitude: 125.0961,
      accuracy: 35,
      page: '/track',
      user_agent: null,
      created_at: now,
    },
    {
      id: 'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa4',
      session_id: 'session-demo-access-004',
      latitude: 6.9994,
      longitude: 125.0788,
      accuracy: 50,
      page: '/',
      user_agent: null,
      created_at: now,
    },
  ]
}

function rememberStaff(database: LocalDatabase, actor: AdminActorRef) {
  const existing = database.staff.find((entry) => entry.user_id === actor.userId)
  if (existing) {
    existing.full_name = actor.fullName
    existing.role = actor.role
    return
  }
  database.staff.push({
    user_id: actor.userId,
    full_name: actor.fullName,
    role: actor.role,
  })
}

async function readDatabase(): Promise<LocalDatabase> {
  const fallback = emptyDatabase()
  try {
    const raw = await readFile(dataFile, 'utf8')
    const parsed = JSON.parse(raw) as Partial<LocalDatabase>
    return {
      ticketCounters: parsed.ticketCounters ?? {},
      categories: parsed.categories?.length ? parsed.categories : fallback.categories,
      departments: parsed.departments?.length ? parsed.departments : fallback.departments,
      staff: parsed.staff ?? [],
      reports: parsed.reports ?? [],
      statusHistory: parsed.statusHistory ?? [],
      notes: parsed.notes ?? [],
      accessLogs: parsed.accessLogs?.length ? parsed.accessLogs : seedAccessLogs(),
    }
  } catch {
    await mkdir(dataDir, { recursive: true })
    await writeFile(dataFile, JSON.stringify(fallback, null, 2), 'utf8')
    return fallback
  }
}

async function writeDatabase(database: LocalDatabase) {
  await mkdir(dataDir, { recursive: true })
  await writeFile(dataFile, JSON.stringify(database, null, 2), 'utf8')
}

function reportStatus(value: string): ReportStatus {
  return isReportStatus(value) ? value : 'submitted'
}

function reportPriority(value: string): ReportPriority {
  return isReportPriority(value) ? value : 'medium'
}

function toRecord(database: LocalDatabase, report: LocalReport): AdminReportRecord {
  const category = database.categories.find((entry) => entry.id === report.category_id)
  const department = report.assigned_department_id
    ? database.departments.find((entry) => entry.id === report.assigned_department_id)
    : undefined
  const staff = report.assigned_admin_id
    ? database.staff.find((entry) => entry.user_id === report.assigned_admin_id)
    : undefined
  return {
    id: report.id,
    ticket_number: report.ticket_number,
    title: report.title,
    description: report.description,
    category_id: report.category_id,
    category_name: category?.name ?? 'Other',
    status: reportStatus(report.status),
    priority: reportPriority(report.priority),
    latitude: report.latitude,
    longitude: report.longitude,
    assigned_department_id: report.assigned_department_id,
    assigned_department_name: department?.name ?? null,
    assigned_admin_id: report.assigned_admin_id,
    assigned_admin_name: staff?.full_name ?? report.assigned_admin_name ?? null,
    created_at: report.created_at,
    updated_at: report.updated_at,
  }
}

function historyItems(database: LocalDatabase, reportId: string): AdminStatusHistoryItem[] {
  return database.statusHistory
    .filter((entry) => entry.report_id === reportId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((entry) => ({
      id: entry.id,
      previous_status: entry.previous_status && isReportStatus(entry.previous_status) ? entry.previous_status : null,
      new_status: reportStatus(entry.new_status),
      note: entry.note,
      actor_name: entry.changed_by_name ?? (entry.changed_by ? 'Administrator' : 'Resident'),
      created_at: entry.created_at,
    }))
}

function noteItems(database: LocalDatabase, reportId: string): AdminNoteItem[] {
  return database.notes
    .filter((entry) => entry.report_id === reportId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((entry) => ({
      id: entry.id,
      note: entry.note,
      actor_name: entry.admin_name,
      created_at: entry.created_at,
    }))
}

function toDetail(database: LocalDatabase, report: LocalReport): AdminReportDetail {
  const record = toRecord(database, report)
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
      full_name: report.full_name,
      birth_date: report.birth_date,
      gender: isGender(report.gender) ? report.gender : 'prefer_not_to_say',
      address: report.address,
      phone: report.phone,
      email: report.email,
    },
    location: locationFrom(report),
    assigned_department_id: record.assigned_department_id,
    assigned_department_name: record.assigned_department_name,
    assigned_admin_id: record.assigned_admin_id,
    assigned_admin_name: record.assigned_admin_name,
    created_at: record.created_at,
    updated_at: record.updated_at,
    history: historyItems(database, report.id),
    notes: noteItems(database, report.id),
  }
}

function requireReport(database: LocalDatabase, ticketNumber: string) {
  const report = database.reports.find((entry) => entry.ticket_number === ticketNumber)
  if (!report) throw new ReportNotFoundError()
  return report
}

export class CategoryNotFoundError extends Error {
  constructor() {
    super('Please choose a valid category.')
    this.name = 'CategoryNotFoundError'
  }
}

function toCatalogItem(
  entry: { id: string; name: string; description: string | null; is_active: boolean; created_at: string },
  usageCount: number,
): CatalogItem {
  return {
    id: entry.id,
    name: entry.name,
    description: entry.description,
    is_active: entry.is_active,
    created_at: entry.created_at,
    usage_count: usageCount,
  }
}

function categoryUsage(database: LocalDatabase, categoryId: string) {
  return database.reports.filter((report) => report.category_id === categoryId).length
}

function departmentUsage(database: LocalDatabase, departmentId: string) {
  return database.reports.filter((report) => report.assigned_department_id === departmentId).length
}

function applyCatalogUpdate<T extends { name: string; description: string | null; is_active: boolean }>(
  entry: T,
  input: CatalogUpdateInput,
) {
  if (input.name !== undefined) entry.name = input.name
  if (input.description !== undefined) entry.description = input.description
  if (input.is_active !== undefined) entry.is_active = input.is_active
}

function createCatalogEntry(input: CatalogCreateInput): LocalCategory {
  return {
    id: crypto.randomUUID(),
    name: input.name,
    description: input.description,
    is_active: input.is_active,
    created_at: new Date().toISOString(),
  }
}

export const localStore: ReportStore = {
  mode: 'local',

  async listPublicCategories() {
    const database = await readDatabase()
    return database.categories
      .filter((category) => category.is_active)
      .map((category) => ({
        id: category.id,
        name: category.name,
        description: category.description,
      }))
  },

  async findPublicByTicket(ticketNumber) {
    const database = await readDatabase()
    const report = database.reports.find((entry) => entry.ticket_number === ticketNumber)
    if (!report) return null
    const category = database.categories.find((entry) => entry.id === report.category_id)
    return {
      ticket_number: report.ticket_number,
      status: reportStatus(report.status),
      category_name: category?.name ?? 'Other',
      created_at: report.created_at,
      updated_at: report.updated_at,
    }
  },

  async getAnalytics(query) {
    const database = await readDatabase()
    const rows = database.reports.map((report) => {
      const department = report.assigned_department_id
        ? database.departments.find((entry) => entry.id === report.assigned_department_id)
        : undefined
      return {
        status: reportStatus(report.status),
        categoryName: database.categories.find((category) => category.id === report.category_id)?.name ?? 'Other',
        departmentName: department?.name ?? null,
        reporterKey: reporterFingerprint(report.phone),
        createdAt: report.created_at,
        latitude: report.latitude,
        longitude: report.longitude,
      }
    })
    return buildAnalytics(rows, query)
  },

  async listAdminReports(query) {
    const database = await readDatabase()
    return paginateAdminReports(database.reports.map((report) => toRecord(database, report)), query)
  },

  async getAdminReport(ticketNumber) {
    const database = await readDatabase()
    const report = database.reports.find((entry) => entry.ticket_number === ticketNumber)
    if (!report) return null
    return toDetail(database, report)
  },

  updateReportStatus(ticketNumber, input, actor) {
    return withLock(async () => {
      const database = await readDatabase()
      rememberStaff(database, actor)
      const report = requireReport(database, ticketNumber)
      const previous = reportStatus(report.status)
      const now = new Date().toISOString()
      report.status = input.status
      report.updated_at = now
      database.statusHistory.push({
        id: crypto.randomUUID(),
        report_id: report.id,
        previous_status: previous,
        new_status: input.status,
        note: input.note?.trim() ? input.note.trim() : null,
        changed_by: actor.userId,
        changed_by_name: actor.fullName,
        created_at: now,
      })
      await writeDatabase(database)
      return toDetail(database, report)
    })
  },

  updateReportPriority(ticketNumber, input, actor) {
    return withLock(async () => {
      const database = await readDatabase()
      rememberStaff(database, actor)
      const report = requireReport(database, ticketNumber)
      report.priority = input.priority
      report.updated_at = new Date().toISOString()
      await writeDatabase(database)
      return toDetail(database, report)
    })
  },

  assignReport(ticketNumber, input, actor) {
    return withLock(async () => {
      const database = await readDatabase()
      rememberStaff(database, actor)
      const report = requireReport(database, ticketNumber)

      if (input.department_id !== undefined) {
        if (input.department_id === null) {
          report.assigned_department_id = null
        } else {
          const department = database.departments.find(
            (entry) => entry.id === input.department_id && entry.is_active,
          )
          if (!department) throw new DepartmentNotFoundError()
          report.assigned_department_id = department.id
        }
      }

      if (input.admin_id !== undefined) {
        if (input.admin_id === null) {
          report.assigned_admin_id = null
          report.assigned_admin_name = null
        } else {
          const staff = database.staff.find((entry) => entry.user_id === input.admin_id)
          if (!staff) throw new StaffNotFoundError()
          report.assigned_admin_id = staff.user_id
          report.assigned_admin_name = staff.full_name
        }
      }

      report.updated_at = new Date().toISOString()
      await writeDatabase(database)
      return toDetail(database, report)
    })
  },

  addReportNote(ticketNumber, note, actor) {
    return withLock(async () => {
      const database = await readDatabase()
      rememberStaff(database, actor)
      const report = requireReport(database, ticketNumber)
      const now = new Date().toISOString()
      database.notes.push({
        id: crypto.randomUUID(),
        report_id: report.id,
        admin_id: actor.userId,
        admin_name: actor.fullName,
        note,
        created_at: now,
      })
      report.updated_at = now
      await writeDatabase(database)
      return toDetail(database, report)
    })
  },

  async listAdminCategories() {
    const database = await readDatabase()
    return database.categories
      .map((category) => toCatalogItem(category, categoryUsage(database, category.id)))
      .sort((a, b) => a.name.localeCompare(b.name))
  },

  createCategory(input) {
    return withLock(async () => {
      const database = await readDatabase()
      if (hasDuplicateCatalogName(database.categories, input.name)) {
        throw new DuplicateCatalogNameError('category')
      }
      const category = createCatalogEntry(input)
      database.categories.push(category)
      await writeDatabase(database)
      return toCatalogItem(category, 0)
    })
  },

  updateCategory(id, input) {
    return withLock(async () => {
      const database = await readDatabase()
      const category = database.categories.find((entry) => entry.id === id)
      if (!category) throw new CatalogItemNotFoundError('category')
      if (input.name !== undefined && hasDuplicateCatalogName(database.categories, input.name, id)) {
        throw new DuplicateCatalogNameError('category')
      }
      if (input.is_active === false && category.is_active) {
        const remaining = database.categories.filter((entry) => entry.is_active && entry.id !== id).length
        if (remaining === 0) throw new LastActiveCategoryError()
      }
      applyCatalogUpdate(category, input)
      await writeDatabase(database)
      return toCatalogItem(category, categoryUsage(database, category.id))
    })
  },

  async listDepartments() {
    const database = await readDatabase()
    return database.departments
      .map((department) => toCatalogItem(department, departmentUsage(database, department.id)))
      .sort((a, b) => a.name.localeCompare(b.name))
  },

  createDepartment(input) {
    return withLock(async () => {
      const database = await readDatabase()
      if (hasDuplicateCatalogName(database.departments, input.name)) {
        throw new DuplicateCatalogNameError('department')
      }
      const department = createCatalogEntry(input)
      database.departments.push(department)
      await writeDatabase(database)
      return toCatalogItem(department, 0)
    })
  },

  updateDepartment(id, input) {
    return withLock(async () => {
      const database = await readDatabase()
      const department = database.departments.find((entry) => entry.id === id)
      if (!department) throw new CatalogItemNotFoundError('department')
      if (input.name !== undefined && hasDuplicateCatalogName(database.departments, input.name, id)) {
        throw new DuplicateCatalogNameError('department')
      }
      applyCatalogUpdate(department, input)
      await writeDatabase(database)
      return toCatalogItem(department, departmentUsage(database, department.id))
    })
  },

  async listStaff() {
    const database = await readDatabase()
    return database.staff.flatMap((entry) => {
      if (!isAdminRole(entry.role)) return []
      return [{ user_id: entry.user_id, full_name: entry.full_name, role: entry.role }]
    }).sort((a, b) => a.full_name.localeCompare(b.full_name))
  },

  createAccessLog(input) {
    return withLock(async () => {
      const database = await readDatabase()
      const now = Date.now()
      const recent = database.accessLogs.find(
        (entry) => entry.session_id === input.session_id && now - new Date(entry.created_at).getTime() < 15 * 60 * 1000,
      )
      if (recent) return
      database.accessLogs.push({
        id: crypto.randomUUID(),
        session_id: input.session_id,
        latitude: input.latitude,
        longitude: input.longitude,
        accuracy: input.accuracy ?? null,
        page: normalizeAccessPage(input.page),
        user_agent: input.user_agent,
        created_at: new Date(now).toISOString(),
      })
      await writeDatabase(database)
    })
  },

  async listMapReports(query) {
    const database = await readDatabase()
    return filterAdminReports(
      database.reports.map((report) => toRecord(database, report)),
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
    const database = await readDatabase()
    return aggregateAccessLogs(
      database.accessLogs.map((entry) => ({
        latitude: entry.latitude,
        longitude: entry.longitude,
        createdAt: entry.created_at,
      })),
      query,
    )
  },

  createReport(input) {
    return withLock(async () => {
      const database = await readDatabase()
      const category = database.categories.find(
        (entry) => entry.id === input.category_id && entry.is_active,
      )
      if (!category) {
        throw new CategoryNotFoundError()
      }

      const year = currentManilaYear()
      const nextValue = (database.ticketCounters[String(year)] ?? 0) + 1
      database.ticketCounters[String(year)] = nextValue

      const now = new Date().toISOString()
      const id = crypto.randomUUID()
      const ticketNumber = formatTicketNumber(year, nextValue)
      const email = input.email?.trim() ? input.email.trim() : null
      const location = input.location ?? null

      const report: LocalReport = {
        id,
        ticket_number: ticketNumber,
        full_name: input.full_name.trim(),
        birth_date: input.birth_date,
        gender: input.gender,
        address: input.address.trim(),
        phone: normalizePhilippineMobile(input.phone),
        email,
        category_id: category.id,
        title: input.title.trim(),
        description: input.description.trim(),
        status: 'submitted',
        priority: 'medium',
        latitude: location?.latitude ?? null,
        longitude: location?.longitude ?? null,
        location_accuracy: location?.accuracy ?? null,
        location_captured_at: location?.timestamp ?? null,
        assigned_department_id: null,
        assigned_admin_id: null,
        assigned_admin_name: null,
        created_at: now,
        updated_at: now,
      }

      database.reports.push(report)
      database.statusHistory.push({
        id: crypto.randomUUID(),
        report_id: id,
        previous_status: null,
        new_status: 'submitted',
        note: 'Report submitted by a resident.',
        changed_by: null,
        changed_by_name: 'Resident',
        created_at: now,
      })

      await writeDatabase(database)

      const created: CreatedReport = {
        id,
        ticket_number: ticketNumber,
        status: 'submitted',
        created_at: now,
        category_name: category.name,
      }
      return created
    })
  },
}
