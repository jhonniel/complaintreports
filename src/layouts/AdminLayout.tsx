import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminTopBar } from '@/components/admin/AdminTopBar'
import { PageTransition } from '@/components/ui/PageTransition'
import { AccessTracker } from '@/features/access/AccessTracker'
import { useMediaQuery } from '@/hooks/useMediaQuery'

export function AdminLayout() {
  const location = useLocation()
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const isMapPage = location.pathname === '/admin/map'

  return (
    <div className="flex min-h-svh min-w-0 bg-ink-50">
      <AccessTracker />
      <AdminSidebar
        collapsed={isDesktop ? collapsed : false}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
        <AdminTopBar
          menuLabel={
            isDesktop ? (collapsed ? 'Expand navigation' : 'Collapse navigation') : 'Open navigation'
          }
          onMenuClick={() => {
            if (isDesktop) setCollapsed((value) => !value)
            else setMobileOpen(true)
          }}
        />
        <main
          id="main"
          className={
            isMapPage
              ? 'min-w-0 flex-1 overflow-x-hidden p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4 md:p-6'
              : 'min-w-0 flex-1 overflow-x-hidden p-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-4 md:p-6'
          }
        >
          {isMapPage ? (
            <Outlet />
          ) : (
            <PageTransition className="min-w-0" motion="fade">
              <Outlet />
            </PageTransition>
          )}
        </main>
      </div>
    </div>
  )
}
