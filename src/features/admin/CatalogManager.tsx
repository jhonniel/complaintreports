import { Fragment, useMemo, useState, type ReactNode } from 'react'
import type { CatalogCreateInput, CatalogItem, CatalogUpdateInput } from '@shared/catalog'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table'
import { Textarea } from '@/components/ui/Textarea'
import { useToast } from '@/components/ui/Toast'
import { ApiError } from '@/services/api'
import { formatCount, formatShortDate } from '@/utils/format'

type StatusFilter = 'all' | 'active' | 'inactive'

interface CatalogManagerProps {
  noun: 'category' | 'department'
  items: CatalogItem[]
  loading: boolean
  error: string | null
  protectLastActive?: boolean
  canManage?: boolean
  userCounts?: Record<string, number>
  expandedId?: string | null
  onToggleUsers?: (item: CatalogItem) => void
  renderUsers?: (item: CatalogItem) => ReactNode
  onCreate: (input: CatalogCreateInput) => Promise<CatalogItem>
  onUpdate: (id: string, input: CatalogUpdateInput) => Promise<CatalogItem>
}

export function CatalogManager({
  noun,
  items,
  loading,
  error,
  protectLastActive = false,
  canManage = true,
  userCounts,
  expandedId,
  onToggleUsers,
  renderUsers,
  onCreate,
  onUpdate,
}: CatalogManagerProps) {
  const { toast } = useToast()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [editor, setEditor] = useState<'create' | CatalogItem | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, setPending] = useState<string | null>(null)

  const activeCount = items.filter((item) => item.is_active).length
  const showUsers = Boolean(onToggleUsers && renderUsers)
  const showActions = canManage || showUsers
  const columnCount =
    5 + (noun === 'department' ? 1 : 0) + (showUsers ? 1 : 0) + (showActions ? 1 : 0)
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return items.filter((item) => {
      if (status === 'active' && !item.is_active) return false
      if (status === 'inactive' && item.is_active) return false
      if (!needle) return true
      return (
        item.name.toLowerCase().includes(needle) ||
        (item.description ?? '').toLowerCase().includes(needle)
      )
    })
  }, [items, query, status])

  function openCreate() {
    setName('')
    setDescription('')
    setFormError(null)
    setEditor('create')
  }

  function openEdit(item: CatalogItem) {
    setName(item.name)
    setDescription(item.description ?? '')
    setFormError(null)
    setEditor(item)
  }

  async function saveEditor() {
    const trimmed = name.trim()
    if (trimmed.length < 2) {
      setFormError('Enter a name with at least 2 characters.')
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      if (editor === 'create') {
        await onCreate({
          name: trimmed,
          description: description.trim() ? description.trim() : null,
          is_active: true,
        })
        toast({ variant: 'success', title: `${capitalize(noun)} created` })
      } else if (editor) {
        await onUpdate(editor.id, {
          name: trimmed,
          description: description.trim() ? description.trim() : null,
        })
        toast({ variant: 'success', title: `${capitalize(noun)} updated` })
      }
      setEditor(null)
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(item: CatalogItem) {
    if (protectLastActive && item.is_active && activeCount <= 1) {
      toast({
        variant: 'error',
        title: 'Keep one active category',
        description: 'Residents need at least one category to submit a report.',
      })
      return
    }
    setPending(item.id)
    try {
      await onUpdate(item.id, { is_active: !item.is_active })
      toast({
        variant: 'success',
        title: item.is_active ? `${capitalize(noun)} deactivated` : `${capitalize(noun)} activated`,
      })
    } catch (err) {
      toast({
        variant: 'error',
        title: err instanceof ApiError ? err.message : 'Something went wrong. Please try again.',
      })
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="flex-1">
            <Label htmlFor={`${noun}-search`}>Search</Label>
            <Input
              id={`${noun}-search`}
              className="mt-1.5"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${noun}s`}
            />
          </div>
          <div className="sm:w-44">
            <Label htmlFor={`${noun}-status`}>Status</Label>
            <Select
              id={`${noun}-status`}
              className="mt-1.5"
              value={status}
              onChange={(event) => setStatus(event.target.value as StatusFilter)}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>
          {canManage ? (
            <Button className="w-full sm:w-auto" onClick={openCreate}>
              Add {noun}
            </Button>
          ) : null}
        </div>
      </Card>

      {error ? (
        <p className="rounded-md border border-danger-500/30 bg-danger-50 px-3 py-2 text-sm text-danger-700" role="alert">
          {error}
        </p>
      ) : null}

      <Card>
        {loading ? (
          <div className="space-y-3 p-4">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={query || status !== 'all' ? `No ${noun}s match` : `No ${noun}s yet`}
            description={
              query || status !== 'all'
                ? 'Try a different search or status filter.'
                : canManage
                  ? `Create the first ${noun} to get started.`
                  : `No ${noun}s are listed yet.`
            }
          />
        ) : (
          <>
          <div className="hidden md:block">
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH className="hidden lg:table-cell">Description</TH>
                <TH>Status</TH>
                <TH>In use</TH>
                {noun === 'department' ? <TH>Pending</TH> : null}
                {showUsers ? <TH>Users</TH> : null}
                <TH className="hidden xl:table-cell">Created</TH>
                {showActions ? <TH className="text-right">Actions</TH> : null}
              </TR>
            </THead>
            <TBody>
              {filtered.map((item) => {
                const isExpanded = expandedId === item.id
                const userCount = userCounts?.[item.id] ?? 0
                return (
                  <Fragment key={item.id}>
                    <TR>
                      <TD className="font-medium">{item.name}</TD>
                      <TD className="hidden max-w-sm text-ink-500 lg:table-cell">{item.description || '—'}</TD>
                      <TD>
                        <Badge variant={item.is_active ? 'success' : 'default'}>
                          {item.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TD>
                      <TD>{formatCount(item.usage_count)}</TD>
                      {noun === 'department' ? (
                        <TD>
                          <span className={(item.pending_count ?? 0) > 0 ? 'font-semibold text-earth-700' : 'text-ink-500'}>
                            {formatCount(item.pending_count ?? 0)}
                          </span>
                        </TD>
                      ) : null}
                      {showUsers ? (
                        <TD>
                          <span className={userCount > 0 ? 'font-medium text-ink-800' : 'text-ink-500'}>
                            {formatCount(userCount)}
                          </span>
                        </TD>
                      ) : null}
                      <TD className="hidden xl:table-cell">{formatShortDate(item.created_at)}</TD>
                      {showActions ? (
                        <TD>
                          <CatalogRowActions
                            item={item}
                            pending={pending === item.id}
                            showUsers={showUsers}
                            isExpanded={isExpanded}
                            canManage={canManage}
                            onToggleUsers={onToggleUsers}
                            onEdit={openEdit}
                            onToggleActive={toggleActive}
                          />
                        </TD>
                      ) : null}
                    </TR>
                    {isExpanded && renderUsers ? (
                      <TR className="hover:bg-transparent">
                        <TD colSpan={columnCount} className="bg-ink-50/70 py-4">
                          {renderUsers(item)}
                        </TD>
                      </TR>
                    ) : null}
                  </Fragment>
                )
              })}
            </TBody>
          </Table>
          </div>
          <ul className="divide-y divide-ink-100 md:hidden">
            {filtered.map((item) => {
              const isExpanded = expandedId === item.id
              const userCount = userCounts?.[item.id] ?? 0
              return (
                <li key={item.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-ink-900">{item.name}</p>
                      {item.description ? (
                        <p className="mt-1 text-sm text-ink-500">{item.description}</p>
                      ) : null}
                    </div>
                    <Badge variant={item.is_active ? 'success' : 'default'}>
                      {item.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                    <div>
                      <dt className="text-ink-400">In use</dt>
                      <dd>{formatCount(item.usage_count)}</dd>
                    </div>
                    {noun === 'department' ? (
                      <div>
                        <dt className="text-ink-400">Pending</dt>
                        <dd className={(item.pending_count ?? 0) > 0 ? 'font-semibold text-earth-700' : undefined}>
                          {formatCount(item.pending_count ?? 0)}
                        </dd>
                      </div>
                    ) : null}
                    {showUsers ? (
                      <div>
                        <dt className="text-ink-400">Users</dt>
                        <dd>{formatCount(userCount)}</dd>
                      </div>
                    ) : null}
                    <div>
                      <dt className="text-ink-400">Created</dt>
                      <dd>{formatShortDate(item.created_at)}</dd>
                    </div>
                  </dl>
                  {showActions ? (
                    <CatalogRowActions
                      item={item}
                      pending={pending === item.id}
                      showUsers={showUsers}
                      isExpanded={isExpanded}
                      canManage={canManage}
                      onToggleUsers={onToggleUsers}
                      onEdit={openEdit}
                      onToggleActive={toggleActive}
                    />
                  ) : null}
                  {isExpanded && renderUsers ? <div className="rounded-md bg-ink-50/80 p-3">{renderUsers(item)}</div> : null}
                </li>
              )
            })}
          </ul>
          </>
        )}
      </Card>

      <Modal
        open={editor !== null}
        title={editor === 'create' ? `Add ${noun}` : `Edit ${noun}`}
        onClose={saving ? undefined : () => setEditor(null)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditor(null)} disabled={saving}>
              Cancel
            </Button>
            <Button loading={saving} onClick={() => void saveEditor()}>
              {editor === 'create' ? 'Create' : 'Save changes'}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Field id={`${noun}-name`} label="Name" required error={formError && name.trim().length < 2 ? formError : undefined}>
            <Input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} />
          </Field>
          <Field id={`${noun}-description`} label="Description" required={false}>
            <Textarea
              className="min-h-24"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={280}
            />
          </Field>
          {formError && name.trim().length >= 2 ? (
            <p className="text-sm text-danger-700" role="alert">
              {formError}
            </p>
          ) : null}
        </div>
      </Modal>
    </div>
  )
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function CatalogRowActions({
  item,
  pending,
  showUsers,
  isExpanded,
  canManage,
  onToggleUsers,
  onEdit,
  onToggleActive,
}: {
  item: CatalogItem
  pending: boolean
  showUsers: boolean
  isExpanded: boolean
  canManage: boolean
  onToggleUsers?: (item: CatalogItem) => void
  onEdit: (item: CatalogItem) => void
  onToggleActive: (item: CatalogItem) => void
}) {
  return (
    <div className="flex flex-wrap gap-2 md:justify-end">
      {showUsers ? (
        <Button variant={isExpanded ? 'secondary' : 'outline'} size="sm" onClick={() => onToggleUsers?.(item)}>
          {isExpanded ? 'Hide' : 'Users'}
        </Button>
      ) : null}
      {canManage ? (
        <>
          <Button variant="outline" size="sm" onClick={() => onEdit(item)}>
            Edit
          </Button>
          <Button
            variant={item.is_active ? 'ghost' : 'secondary'}
            size="sm"
            loading={pending}
            onClick={() => onToggleActive(item)}
          >
            {item.is_active ? 'Deactivate' : 'Activate'}
          </Button>
        </>
      ) : null}
    </div>
  )
}
