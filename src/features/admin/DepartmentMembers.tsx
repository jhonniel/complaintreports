import { useEffect, useMemo, useState } from 'react'
import type { CatalogItem } from '@shared/catalog'
import type { CreateStaffInput, StaffOption } from '@shared/adminReport'
import { createStaffSchema, generateStaffPassword } from '@shared/adminReport'
import { ROLE_LABELS } from '@shared/auth'
import { fieldErrors } from '@shared/report'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { createStaff, updateStaffDepartment } from '@/features/admin/reportApi'
import { ApiError } from '@/services/api'
import { useToast } from '@/components/ui/Toast'

interface DepartmentUsersPanelProps {
  department: CatalogItem
  staff: StaffOption[]
  canManage: boolean
  movingId: string | null
  onAddUser: () => void
  onRemoveUser: (userId: string) => void
}

interface DepartmentUserDialogsProps {
  department: CatalogItem | null
  staff: StaffOption[]
  onClose: () => void
  onStaffChange: (staff: StaffOption[]) => void
}

interface CreatedLogin {
  full_name: string
  email: string
  password: string
  department_name: string
}

export function DepartmentUsersPanel({
  department,
  staff,
  canManage,
  movingId,
  onAddUser,
  onRemoveUser,
}: DepartmentUsersPanelProps) {
  const team = useMemo(
    () =>
      staff
        .filter((member) => member.department_id === department.id)
        .sort((a, b) => a.full_name.localeCompare(b.full_name)),
    [department.id, staff],
  )

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-ink-500">
          {team.length === 0
            ? 'No users in this office yet.'
            : `${team.length} user${team.length === 1 ? '' : 's'} can receive assigned tickets.`}
        </p>
        {canManage && department.is_active ? (
          <Button size="sm" onClick={onAddUser}>
            Add user
          </Button>
        ) : null}
      </div>
      {team.length === 0 ? (
        <p className="text-sm text-ink-500">
          {canManage
            ? 'Add a user here, then assign reports to them from a ticket.'
            : 'Administrators add users for this office.'}
        </p>
      ) : (
        <ul className="divide-y divide-ink-100 overflow-hidden rounded-md border border-ink-100 bg-white">
          {team.map((member) => (
            <li key={member.user_id} className="flex items-center justify-between gap-3 px-3 py-2">
              <div>
                <p className="font-medium text-ink-800">{member.full_name}</p>
                <p className="text-xs text-ink-500">{ROLE_LABELS[member.role]}</p>
              </div>
              {canManage ? (
                <Button
                  variant="ghost"
                  size="sm"
                  loading={movingId === member.user_id}
                  onClick={() => onRemoveUser(member.user_id)}
                >
                  Remove
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function DepartmentUserDialogs({
  department,
  staff,
  onClose,
  onStaffChange,
}: DepartmentUserDialogsProps) {
  const { toast } = useToast()
  const [created, setCreated] = useState<CreatedLogin | null>(null)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<CreateStaffInput['role']>('staff')
  const [existingId, setExistingId] = useState('')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)

  const unassigned = useMemo(
    () => staff.filter((member) => !member.department_id).sort((a, b) => a.full_name.localeCompare(b.full_name)),
    [staff],
  )

  useEffect(() => {
    if (!department) return
    setFullName('')
    setEmail('')
    setPassword(generateStaffPassword())
    setRole('staff')
    setExistingId('')
    setErrors({})
    setFormError(null)
  }, [department])

  function resetForm() {
    setFullName('')
    setEmail('')
    setPassword(generateStaffPassword())
    setRole('staff')
    setExistingId('')
    setErrors({})
    setFormError(null)
  }

  function replaceStaff(next: StaffOption) {
    onStaffChange(
      [...staff.filter((entry) => entry.user_id !== next.user_id), next].sort((a, b) =>
        a.full_name.localeCompare(b.full_name),
      ),
    )
  }

  async function saveNewUser() {
    if (!department) return
    const parsed = createStaffSchema.safeParse({
      full_name: fullName,
      email,
      password,
      role,
      department_id: department.id,
    })
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error))
      return
    }
    setSaving(true)
    setFormError(null)
    setErrors({})
    try {
      const result = await createStaff(parsed.data)
      replaceStaff(result.staff)
      setCreated({
        full_name: result.staff.full_name,
        email: parsed.data.email,
        password: parsed.data.password,
        department_name: result.staff.department_name ?? department.name,
      })
      resetForm()
      onClose()
      toast({ variant: 'success', title: 'User added to department' })
    } catch (caught) {
      setFormError(caught instanceof ApiError ? caught.message : 'Unable to add that user.')
    } finally {
      setSaving(false)
    }
  }

  async function attachExisting() {
    if (!department || !existingId) return
    setSaving(true)
    setFormError(null)
    try {
      const result = await updateStaffDepartment(existingId, department.id)
      replaceStaff(result.staff)
      resetForm()
      onClose()
      toast({ variant: 'success', title: 'User moved to this department' })
    } catch (caught) {
      setFormError(caught instanceof ApiError ? caught.message : 'Unable to move that user.')
    } finally {
      setSaving(false)
    }
  }

  async function copyText(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value)
      toast({ variant: 'success', title: `${label} copied` })
    } catch {
      toast({ variant: 'error', title: `Could not copy ${label.toLowerCase()}` })
    }
  }

  return (
    <>
      <Modal
        open={department !== null}
        title={department ? `Add user · ${department.name}` : 'Add user'}
        description="They can sign in at Admin login and work on tickets assigned to this department."
        onClose={saving ? undefined : onClose}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button loading={saving} onClick={() => void saveNewUser()}>
              Create user
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          {unassigned.length > 0 ? (
            <div className="rounded-md border border-ink-100 bg-ink-50 p-3">
              <Field id="existing-staff" label="Move an existing account" required={false}>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Select
                    className="flex-1"
                    value={existingId}
                    onChange={(event) => setExistingId(event.target.value)}
                  >
                    <option value="">Choose a user</option>
                    {unassigned.map((member) => (
                      <option key={member.user_id} value={member.user_id}>
                        {member.full_name} · {ROLE_LABELS[member.role]}
                      </option>
                    ))}
                  </Select>
                  <Button variant="outline" disabled={!existingId || saving} onClick={() => void attachExisting()}>
                    Move
                  </Button>
                </div>
              </Field>
            </div>
          ) : null}
          <Field id="staff-name" label="Full name" required error={errors.full_name}>
            <Input value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" />
          </Field>
          <Field id="staff-email" label="Email" required error={errors.email} hint="Used to sign in.">
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="off"
            />
          </Field>
          <Field
            id="staff-password"
            label="Temporary password"
            required
            error={errors.password}
            hint="Share this once. They use it on the admin login page."
          >
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                className="font-mono"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
              />
              <Button type="button" variant="outline" onClick={() => setPassword(generateStaffPassword())}>
                New
              </Button>
            </div>
          </Field>
          <Field id="staff-role" label="Role" required>
            <Select value={role} onChange={(event) => setRole(event.target.value as CreateStaffInput['role'])}>
              <option value="staff">Staff — act on this department’s tickets</option>
              <option value="admin">Administrator — assign tickets and manage this office</option>
            </Select>
          </Field>
          {formError ? (
            <p className="text-sm text-danger-700" role="alert">
              {formError}
            </p>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={created !== null}
        title="User created"
        description="Copy these details now. The password is not shown again."
        onClose={() => setCreated(null)}
        footer={
          <div className="flex justify-end">
            <Button onClick={() => setCreated(null)}>Done</Button>
          </div>
        }
      >
        {created ? (
          <div className="space-y-3 text-sm">
            <p>
              <strong>{created.full_name}</strong> can work on {created.department_name} tickets after they sign in.
            </p>
            <div className="rounded-md border border-ink-100 bg-ink-50 p-3 font-mono text-sm">
              <p>Email: {created.email}</p>
              <p className="mt-1">Password: {created.password}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => void copyText(created.email, 'Email')}>
                Copy email
              </Button>
              <Button variant="outline" size="sm" onClick={() => void copyText(created.password, 'Password')}>
                Copy password
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  )
}
