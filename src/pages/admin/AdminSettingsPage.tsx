import { useEffect, useState } from 'react'
import type { CatalogItem } from '@shared/catalog'
import type { StaffOption } from '@shared/adminReport'
import { canManageStaff, ROLE_LABELS } from '@shared/auth'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table'
import { useAuth } from '@/features/auth/AuthProvider'
import { fetchFacebookStatus } from '@/features/admin/facebookApi'
import { fetchAdminDepartments } from '@/features/admin/catalogApi'
import { fetchStaff, updateStaffDepartment } from '@/features/admin/reportApi'
import { CURRENT_PHASE, CURRENT_PHASE_LABEL } from '@/lib/constants'
import type { FacebookConnectionStatus } from '@shared/facebookIntake'
import { ApiError } from '@/services/api'
import { useToast } from '@/components/ui/Toast'

export function AdminSettingsPage() {
  const { profile, isConfigured, signOut } = useAuth()
  const { toast } = useToast()
  const canManage = profile ? canManageStaff(profile.role) : false
  const [facebook, setFacebook] = useState<FacebookConnectionStatus | null>(null)
  const [staff, setStaff] = useState<StaffOption[]>([])
  const [departments, setDepartments] = useState<CatalogItem[]>([])
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    void fetchFacebookStatus()
      .then(setFacebook)
      .catch(() =>
        setFacebook({
          oauth_ready: false,
          configured: false,
          page_configured: false,
          page_id: null,
          page_name: null,
          source: null,
        }),
      )
  }, [])

  useEffect(() => {
    if (!canManage) return
    void Promise.all([fetchStaff(), fetchAdminDepartments()])
      .then(([staffResult, departmentResult]) => {
        setStaff(staffResult.staff)
        setDepartments(departmentResult.departments)
      })
      .catch(() => {
        setStaff([])
        setDepartments([])
      })
  }, [canManage])

  async function saveDepartment(userId: string, departmentId: string) {
    setSavingId(userId)
    try {
      const result = await updateStaffDepartment(userId, departmentId || null)
      setStaff((current) => current.map((entry) => (entry.user_id === userId ? result.staff : entry)))
      toast({ variant: 'success', title: 'Staff department saved' })
    } catch (caught) {
      toast({
        variant: 'error',
        title: 'Could not update staff',
        description: caught instanceof ApiError ? caught.message : 'Try again.',
      })
    } finally {
      setSavingId(null)
    }
  }

  const staffDepartmentName = staff.find((entry) => entry.user_id === profile?.userId)?.department_name

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-ink-500">Profile, session, and environment status for this workspace.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Admin profile</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3 text-sm">
          <p>
            Name: <strong>{profile?.fullName ?? '—'}</strong>
          </p>
          <p>
            Email: <strong>{profile?.email ?? '—'}</strong>
          </p>
          <p>
            Role: <strong>{profile ? ROLE_LABELS[profile.role] : '—'}</strong>
          </p>
          <p>
            Department:{' '}
            <strong>{staffDepartmentName ?? (profile?.departmentId ? 'Assigned' : 'Not assigned')}</strong>
          </p>
          <p className="text-ink-500">
            Administrators assign tickets to a department. Staff in that department can update status, priority, and
            notes on those tickets.
          </p>
        </CardBody>
      </Card>
      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>Staff departments</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3 text-sm">
            <p className="text-ink-500">
              Put staff in a department so they only see and act on tickets assigned to that office.
            </p>
            {staff.length === 0 ? (
              <p className="text-ink-500">No staff accounts yet.</p>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Name</TH>
                    <TH>Role</TH>
                    <TH>Department</TH>
                  </TR>
                </THead>
                <TBody>
                  {staff.map((member) => (
                    <TR key={member.user_id}>
                      <TD className="font-medium">{member.full_name}</TD>
                      <TD>{ROLE_LABELS[member.role]}</TD>
                      <TD>
                        <Select
                          value={member.department_id ?? ''}
                          disabled={savingId === member.user_id}
                          onChange={(event) => void saveDepartment(member.user_id, event.target.value)}
                        >
                          <option value="">Not assigned</option>
                          {departments.map((department) => (
                            <option key={department.id} value={department.id}>
                              {department.name}
                            </option>
                          ))}
                        </Select>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardBody>
        </Card>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Environment</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3 text-sm">
          <p>
            Current phase: <strong>Phase {CURRENT_PHASE} — {CURRENT_PHASE_LABEL}</strong>
          </p>
          <p>
            Supabase client: <strong>{isConfigured ? 'Configured' : 'Not configured'}</strong>
          </p>
          <p>
            TomTom map: <strong>{import.meta.env.VITE_TOMTOM_API_KEY ? 'Configured' : 'Not configured'}</strong>
          </p>
          <p>
            Facebook intake:{' '}
            <strong>
              {facebook?.page_name
                ? facebook.page_name
                : facebook?.configured
                  ? 'Connected'
                  : 'Not connected'}
            </strong>
          </p>
          <p className="text-ink-500">
            Never put the service role key in frontend environment variables.
          </p>
          <Button variant="outline" onClick={() => void signOut()}>
            Log out
          </Button>
        </CardBody>
      </Card>
    </div>
  )
}
