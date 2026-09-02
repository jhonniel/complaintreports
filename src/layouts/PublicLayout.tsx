import { Outlet } from 'react-router-dom'
import { PublicFooter } from '@/components/public/PublicFooter'
import { PublicHeader } from '@/components/public/PublicHeader'
import { AccessLocationLogger } from '@/features/access/AccessLocationLogger'

export function PublicLayout() {
  return (
    <div className="flex min-h-svh flex-col bg-ink-50">
      <AccessLocationLogger />
      <PublicHeader />
      <main id="main" className="animate-fade-up flex-1">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  )
}
