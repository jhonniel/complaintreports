import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { cn } from '@/lib/cn'

export function PageTransition({ children, className }: { children: ReactNode; className?: string }) {
  const location = useLocation()
  return (
    <div key={location.pathname} className={cn('animate-page-in', className)}>
      {children}
    </div>
  )
}
