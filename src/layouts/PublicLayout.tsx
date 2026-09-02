import { Outlet } from 'react-router-dom'
import { PublicFooter } from '@/components/public/PublicFooter'
import { PublicHeader } from '@/components/public/PublicHeader'
import { PageTransition } from '@/components/ui/PageTransition'

export function PublicLayout() {
  return (
    <div className="flex min-h-svh min-w-0 flex-col bg-ink-50">
      <PublicHeader />
      <main id="main" className="min-w-0 w-full flex-1 overflow-x-hidden">
        <PageTransition className="min-w-0 w-full">
          <Outlet />
        </PageTransition>
      </main>
      <PublicFooter />
    </div>
  )
}
