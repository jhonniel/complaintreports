import { logError } from './log.ts'

const PAGE_SIZE = 1000
const MAX_ROWS = 100_000

export async function fetchAllRows<T>(
  execute: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const rows: T[] = []
  let from = 0
  for (;;) {
    const { data, error } = await execute(from, from + PAGE_SIZE - 1)
    if (error) {
      logError('store', error)
      throw new Error('STORAGE_UNAVAILABLE')
    }
    const page = data ?? []
    rows.push(...page)
    if (page.length < PAGE_SIZE || rows.length >= MAX_ROWS) return rows
    from += PAGE_SIZE
  }
}
