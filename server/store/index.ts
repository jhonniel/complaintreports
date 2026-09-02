import { hasServiceRole, isProduction } from '../config/env.ts'
import { ProductionStorageError } from '../lib/errors.ts'
import { localStore } from './localStore.ts'
import { createSupabaseStore } from './supabaseStore.ts'
import type { ReportStore } from './types.ts'
import { ensureSupabaseSeed } from '../lib/seedSupabase.ts'

let cached: ReportStore | null = null

export function getReportStore(): ReportStore {
  if (cached) return cached
  if (hasServiceRole) {
    const supabaseStore = createSupabaseStore()
    if (supabaseStore) {
      cached = supabaseStore
      void ensureSupabaseSeed()
      return cached
    }
  }
  if (isProduction) {
    throw new ProductionStorageError()
  }
  cached = localStore
  return cached
}
