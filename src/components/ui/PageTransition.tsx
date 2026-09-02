import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { cn } from '@/lib/cn'

export function PageTransition({
  children,
  className,
  motion = 'slide',
}: {
  children: ReactNode
  className?: string
  motion?: 'slide' | 'fade'
}) {
  const location = useLocation()
  return (
    <div
      key={location.pathname}
      className={cn(motion === 'fade' ? 'animate-fade-in' : 'animate-page-in', className)}
    >
      {children}
    </div>
  )
}
