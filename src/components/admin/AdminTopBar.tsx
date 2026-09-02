import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, Menu, PanelLeft, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { fetchAnalytics } from '@/features/admin/analyticsApi'
import { useAuth } from '@/features/auth/AuthProvider'
import { formatLongDate } from '@/utils/format'
import { initials, ROLE_LABELS } from '@shared/auth'

interface AdminTopBarProps {
  onMenuClick: () => void
  menuLabel: string
}

export function AdminTopBar({ onMenuClick, menuLabel }: AdminTopBarProps) {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [pending, setPending] = useState(0)
  const [alertsOpen, setAlertsOpen] = useState(false)
  const alertsRef = useRef<HTMLDivElement>(null)
  const name = profile?.fullName ?? 'Administrator'
  const role = profile ? ROLE_LABELS[profile.role] : 'Administrator'

  useEffect(() => {
    let cancelled = false
    fetchAnalytics('monthly', 'all')
      .then((data) => {
        if (!cancelled) setPending(data.totals.pending)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!alertsRef.current?.contains(event.target as Node)) setAlertsOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <header className="flex h-16 items-center gap-3 border-b border-ink-200 bg-white px-4">
      <Button variant="ghost" size="sm" className="px-2" onClick={onMenuClick} aria-label={menuLabel}>
        <span className="lg:hidden">
          <Menu className="size-5" />
        </span>
        <span className="hidden lg:inline">
          <PanelLeft className="size-5" />
        </span>
      </Button>
      <form
        className="relative min-w-0 flex-1"
        role="search"
        onSubmit={(event) => {
          event.preventDefault()
          const next = query.trim()
          navigate(next ? `/admin/reports?q=${encodeURIComponent(next)}` : '/admin/reports')
        }}
      >
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-400" />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search tickets"
          className="max-w-xl pl-9"
          aria-label="Search reports"
        />
      </form>
      <p className="hidden text-sm text-ink-500 xl:block">{formatLongDate()}</p>
      <Button
        variant="outline"
        size="sm"
        className="hidden sm:inline-flex"
        onClick={() => navigate('/submit')}
      >
        <Plus className="size-4" />
        New Report
      </Button>
      <div className="relative" ref={alertsRef}>
        <Button
          variant="ghost"
          size="sm"
          className="relative px-2"
          aria-label="Notifications"
          aria-expanded={alertsOpen}
          onClick={() => setAlertsOpen((open) => !open)}
        >
          <Bell className="size-5" />
          {pending > 0 ? (
            <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-earth-500" aria-hidden="true" />
          ) : null}
        </Button>
        {alertsOpen ? (
          <div
            className="absolute right-0 z-20 mt-2 w-72 rounded-lg border border-ink-200 bg-white p-3 shadow-raised"
            role="menu"
          >
            <p className="text-sm font-semibold text-ink-900">Attention</p>
            <p className="mt-1 text-xs text-ink-500">
              {pending > 0
                ? `${pending} pending report${pending === 1 ? '' : 's'} still need review.`
                : 'No pending reports in this workspace.'}
            </p>
            <div className="mt-3 space-y-1">
              <Link
                className="block rounded-md px-2 py-2 text-sm text-ink-800 hover:bg-ink-50"
                to="/admin/reports?priority=urgent"
                onClick={() => setAlertsOpen(false)}
              >
                Urgent reports
              </Link>
              <Link
                className="block rounded-md px-2 py-2 text-sm text-ink-800 hover:bg-ink-50"
                to="/admin/reports?priority=high"
                onClick={() => setAlertsOpen(false)}
              >
                High priority
              </Link>
              <Link
                className="block rounded-md px-2 py-2 text-sm text-ink-800 hover:bg-ink-50"
                to="/admin/reports?status=submitted"
                onClick={() => setAlertsOpen(false)}
              >
                Newly submitted
              </Link>
            </div>
          </div>
        ) : null}
      </div>
      <Link
        to="/admin/settings"
        className="flex items-center gap-2 rounded-md border border-ink-200 px-2 py-1.5 hover:bg-ink-50"
        aria-label="Open settings"
      >
        <div className="flex size-8 items-center justify-center rounded-full bg-pine-800 text-xs font-semibold text-white">
          {initials(name)}
        </div>
        <div className="hidden leading-tight sm:block">
          <p className="text-sm font-semibold text-ink-900">{name}</p>
          <p className="text-[11px] text-ink-500">{role}</p>
        </div>
      </Link>
    </header>
  )
}
