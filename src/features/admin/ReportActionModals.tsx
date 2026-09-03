import { useEffect, useState } from 'react'
import type { AdminReportDetail, DepartmentOption, StaffOption } from '@shared/adminReport'
import { PRIORITY_LABELS, REPORT_PRIORITIES, REPORT_STATUSES, STATUS_LABELS } from '@shared/report'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { useToast } from '@/components/ui/Toast'
import {
  addReportNote,
  assignReport,
  deleteReport,
  updateReportPriority,
  updateReportStatus,
} from '@/features/admin/reportApi'
import { ApiError } from '@/services/api'

export type ReportAction = 'status' | 'priority' | 'assign' | 'note' | 'delete'

interface ReportActionModalsProps {
  ticketNumber: string
  action: ReportAction | null
  status: string
  priority: string
  departmentId: string | null
  adminId: string | null
  departments: DepartmentOption[]
  staff: StaffOption[]
  onClose: () => void
  onSaved: (report: AdminReportDetail) => void
  onDeleted?: () => void
}

export function ReportActionModals({
  ticketNumber,
  action,
  status,
  priority,
  departmentId,
  adminId,
  departments,
  staff,
  onClose,
  onSaved,
  onDeleted,
}: ReportActionModalsProps) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nextStatus, setNextStatus] = useState(status)
  const [note, setNote] = useState('')
  const [nextPriority, setNextPriority] = useState(priority)
  const [nextDepartment, setNextDepartment] = useState(departmentId ?? '')
  const [nextAdmin, setNextAdmin] = useState(adminId ?? '')

  useEffect(() => {
    setNextStatus(status)
    setNextPriority(priority)
    setNextDepartment(departmentId ?? '')
    setNextAdmin(adminId ?? '')
    setNote('')
    setError(null)
  }, [action, ticketNumber, status, priority, departmentId, adminId])

  async function run(work: () => Promise<AdminReportDetail>, success: string) {
    setSaving(true)
    setError(null)
    try {
      const report = await work()
      toast({ variant: 'success', title: success })
      onSaved(report)
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const assignableDepartments = departments.filter(
    (department) => department.is_active || department.id === departmentId,
  )

  return (
    <>
      <Modal
        open={action === 'status'}
        title="Update status"
        description={`Ticket ${ticketNumber}`}
        onClose={onClose}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              loading={saving}
              onClick={() =>
                void run(
                  () =>
                    updateReportStatus(ticketNumber, {
                      status: nextStatus as AdminReportDetail['status'],
                      note: note.trim() || undefined,
                    }),
                  'Status updated',
                )
              }
            >
              Save status
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Field id="action-status" label="Status">
            <Select value={nextStatus} onChange={(event) => setNextStatus(event.target.value)}>
              {REPORT_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {STATUS_LABELS[value]}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="action-status-note" label="Internal note" required={false}>
            <Textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={2000}
              className="min-h-24"
            />
          </Field>
          {error && action === 'status' ? <p className="text-sm text-danger-700">{error}</p> : null}
        </div>
      </Modal>

      <Modal
        open={action === 'priority'}
        title="Update priority"
        description={`Ticket ${ticketNumber}`}
        onClose={onClose}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              loading={saving}
              onClick={() =>
                void run(
                  () =>
                    updateReportPriority(ticketNumber, {
                      priority: nextPriority as AdminReportDetail['priority'],
                    }),
                  'Priority updated',
                )
              }
            >
              Save priority
            </Button>
          </div>
        }
      >
        <Field id="action-priority" label="Priority">
          <Select value={nextPriority} onChange={(event) => setNextPriority(event.target.value)}>
            {REPORT_PRIORITIES.map((value) => (
              <option key={value} value={value}>
                {PRIORITY_LABELS[value]}
              </option>
            ))}
          </Select>
        </Field>
        {error && action === 'priority' ? <p className="mt-3 text-sm text-danger-700">{error}</p> : null}
      </Modal>

      <Modal
        open={action === 'assign'}
        title="Assign report"
        description={`Ticket ${ticketNumber}`}
        onClose={onClose}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              loading={saving}
              onClick={() =>
                void run(
                  () =>
                    assignReport(ticketNumber, {
                      department_id: nextDepartment || null,
                      admin_id: nextAdmin || null,
                    }),
                  'Assignment saved',
                )
              }
            >
              Save assignment
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Field id="action-department" label="Department" required={false}>
            <Select value={nextDepartment} onChange={(event) => setNextDepartment(event.target.value)}>
              <option value="">Unassigned</option>
              {assignableDepartments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.is_active ? department.name : `${department.name} (inactive)`}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="action-staff" label="Assigned staff" required={false}>
            <Select value={nextAdmin} onChange={(event) => setNextAdmin(event.target.value)}>
              <option value="">Unassigned</option>
              {staff.map((member) => (
                <option key={member.user_id} value={member.user_id}>
                  {member.full_name}
                </option>
              ))}
            </Select>
          </Field>
          {error && action === 'assign' ? <p className="text-sm text-danger-700">{error}</p> : null}
        </div>
      </Modal>

      <Modal
        open={action === 'note'}
        title="Add internal note"
        description={`Ticket ${ticketNumber}`}
        onClose={onClose}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              loading={saving}
              disabled={!note.trim()}
              onClick={() => void run(() => addReportNote(ticketNumber, { note: note.trim() }), 'Note added')}
            >
              Add note
            </Button>
          </div>
        }
      >
        <Field id="action-note" label="Note">
          <Textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} />
        </Field>
        {error && action === 'note' ? <p className="mt-3 text-sm text-danger-700">{error}</p> : null}
      </Modal>

      <Modal
        open={action === 'delete'}
        title="Delete report"
        description={`Ticket ${ticketNumber}`}
        onClose={saving ? undefined : onClose}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={saving}
              onClick={() => {
                void (async () => {
                  setSaving(true)
                  setError(null)
                  try {
                    await deleteReport(ticketNumber)
                    toast({ variant: 'success', title: 'Report deleted' })
                    onDeleted?.()
                    onClose()
                  } catch (err) {
                    setError(err instanceof ApiError ? err.message : 'Unable to delete this report.')
                  } finally {
                    setSaving(false)
                  }
                })()
              }}
            >
              Delete report
            </Button>
          </div>
        }
      >
        <p className="text-sm leading-relaxed text-ink-700">
          This permanently removes the ticket, photos, notes, and reporter details. Tracking this
          number will no longer work.
        </p>
        {error && action === 'delete' ? <p className="mt-3 text-sm text-danger-700">{error}</p> : null}
      </Modal>
    </>
  )
}
