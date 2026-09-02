import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminTopBar } from '@/components/admin/AdminTopBar'
import { useMediaQuery } from '@/hooks/useMediaQuery'

export function AdminLayout() {
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-svh bg-ink-50">
      <AdminSidebar
        collapsed={isDesktop ? collapsed : false}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopBar
          menuLabel={
            isDesktop ? (collapsed ? 'Expand navigation' : 'Collapse navigation') : 'Open navigation'
          }
          onMenuClick={() => {
            if (isDesktop) setCollapsed((value) => !value)
            else setMobileOpen(true)
          }}
        />
        <main id="main" className="animate-fade-up flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
