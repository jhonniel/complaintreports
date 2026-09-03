import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { useAuth } from '@/features/auth/AuthProvider'
import { fetchFacebookStatus } from '@/features/admin/facebookApi'
import { CURRENT_PHASE, CURRENT_PHASE_LABEL } from '@/lib/constants'
import { ROLE_LABELS } from '@shared/auth'
import { useEffect, useState } from 'react'

export function AdminSettingsPage() {
  const { profile, isConfigured, signOut } = useAuth()
  const [facebook, setFacebook] = useState<{ configured: boolean; page_configured: boolean } | null>(null)

  useEffect(() => {
    void fetchFacebookStatus()
      .then(setFacebook)
      .catch(() => setFacebook({ configured: false, page_configured: false }))
  }, [])

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
          <p className="text-ink-500">
            Staff can work tickets. Administrators and super admins can also change categories and
            departments.
          </p>
        </CardBody>
      </Card>
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
              {facebook?.configured
                ? facebook.page_configured
                  ? 'Token and Page ID set'
                  : 'Token set'
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
