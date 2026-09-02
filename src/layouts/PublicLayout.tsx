import { Outlet } from 'react-router-dom'
import { PublicFooter } from '@/components/public/PublicFooter'
import { PublicHeader } from '@/components/public/PublicHeader'
import { PageTransition } from '@/components/ui/PageTransition'

export function PublicLayout() {
  return (
    <div className="flex min-h-svh flex-col bg-ink-50">
      <PublicHeader />
      <main id="main" className="flex-1">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>
      <PublicFooter />
    </div>
  )
}
