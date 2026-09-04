import { z } from 'zod'

export const CATALOG_NAME_MAX = 80
export const CATALOG_DESCRIPTION_MAX = 280

export interface CatalogItem {
  id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
  usage_count: number
  pending_count?: number
}

export interface CatalogCreateInput {
  name: string
  description: string | null
  is_active: boolean
}

export interface CatalogUpdateInput {
  name?: string
  description?: string | null
  is_active?: boolean
}

const nameSchema = z
  .string()
  .trim()
  .min(2, 'Enter a name with at least 2 characters.')
  .max(CATALOG_NAME_MAX, `Keep the name under ${CATALOG_NAME_MAX} characters.`)

const descriptionSchema = z
  .string()
  .trim()
  .max(CATALOG_DESCRIPTION_MAX, `Keep the description under ${CATALOG_DESCRIPTION_MAX} characters.`)
  .nullable()
  .optional()

export const catalogCreateSchema = z.object({
  name: nameSchema,
  description: descriptionSchema,
  is_active: z.boolean().optional(),
})

export const catalogUpdateSchema = z
  .object({
    name: nameSchema.optional(),
    description: descriptionSchema,
    is_active: z.boolean().optional(),
  })
  .refine(
    (value) => value.name !== undefined || value.description !== undefined || value.is_active !== undefined,
    { message: 'Provide at least one field to update.' },
  )

export function normalizeCatalogName(name: string) {
  return name.trim().replace(/\s+/g, ' ')
}

export function catalogNameKey(name: string) {
  return normalizeCatalogName(name).toLowerCase()
}

export function catalogDescription(value: string | null | undefined) {
  if (value == null) return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export function parseCatalogCreate(input: z.infer<typeof catalogCreateSchema>): CatalogCreateInput {
  return {
    name: normalizeCatalogName(input.name),
    description: catalogDescription(input.description),
    is_active: input.is_active ?? true,
  }
}

export function parseCatalogUpdate(input: z.infer<typeof catalogUpdateSchema>): CatalogUpdateInput {
  const next: CatalogUpdateInput = {}
  if (input.name !== undefined) next.name = normalizeCatalogName(input.name)
  if (input.description !== undefined) next.description = catalogDescription(input.description)
  if (input.is_active !== undefined) next.is_active = input.is_active
  return next
}

export function hasDuplicateCatalogName(
  items: Array<{ id: string; name: string }>,
  name: string,
  excludeId?: string,
) {
  const key = catalogNameKey(name)
  return items.some((item) => item.id !== excludeId && catalogNameKey(item.name) === key)
}
