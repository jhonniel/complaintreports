import { NavLink } from 'react-router-dom'
import {
  Building2,
  ChartColumn,
  FileText,
  LayoutDashboard,
  LogOut,
  Map,
  Settings,
  Tags,
  X,
} from 'lucide-react'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/Button'
import { ADMIN_NAV } from '@/lib/constants'
import { cn } from '@/lib/cn'
import { useAuth } from '@/features/auth/AuthProvider'

const icons = {
  LayoutDashboard,
  FileText,
  Map,
  ChartColumn,
  Tags,
  Building2,
  Settings,
} as const

interface AdminSidebarProps {
  collapsed: boolean
  mobileOpen: boolean
  onCloseMobile: () => void
}

export function AdminSidebar({ collapsed, mobileOpen, onCloseMobile }: AdminSidebarProps) {
  const { signOut, profile } = useAuth()
  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 animate-fade-in bg-ink-950/40 lg:hidden"
          aria-label="Close navigation"
          onClick={onCloseMobile}
        />
      ) : null}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col bg-pine-950 text-pine-50 transition-all duration-300 ease-out lg:static lg:translate-x-0',
          collapsed ? 'lg:w-[4.5rem]' : 'lg:w-64',
          'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="flex h-16 items-center justify-between px-4">
          {collapsed ? (
            <Logo variant="mark" tone="light" to="/admin/dashboard" />
          ) : (
            <Logo tone="light" to="/admin/dashboard" />
          )}
          <Button
            variant="ghost"
            size="sm"
            className="px-2 text-pine-100 hover:bg-white/10 lg:hidden"
            onClick={onCloseMobile}
            aria-label="Close sidebar"
          >
            <X className="size-4" />
          </Button>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Admin">
          {ADMIN_NAV.map((item) => {
            const Icon = icons[item.icon]
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-200',
                    isActive ? 'bg-white/10 text-white' : 'text-pine-100/80 hover:bg-white/5 hover:text-white',
                    collapsed && 'lg:justify-center lg:px-2',
                  )
                }
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                <span className={cn(collapsed && 'lg:hidden')}>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>
        <div className="space-y-2 px-3 pb-4">
          <Button
            variant="ghost"
            className={cn(
              'w-full justify-start gap-3 px-3 text-pine-100/80 hover:bg-white/5 hover:text-white',
              collapsed && 'lg:justify-center lg:px-2',
            )}
            onClick={() => {
              onCloseMobile()
              void signOut()
            }}
          >
            <LogOut className="size-4 shrink-0" aria-hidden="true" />
            <span className={cn(collapsed && 'lg:hidden')}>Log out</span>
          </Button>
          <p className={cn('px-1 text-[11px] text-pine-200/60', collapsed && 'lg:hidden')}>
            {profile ? `${profile.fullName} · authorized only` : 'Authorized personnel only'}
          </p>
        </div>
      </aside>
    </>
  )
}
