import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { Spinner } from '@/components/ui/Spinner'
import { useAuth } from '@/features/auth/AuthProvider'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <div className="flex min-h-svh items-center justify-center bg-ink-50">
        <Spinner className="size-6 text-pine-800" />
        <span className="sr-only">Loading</span>
      </div>
    )
  }

  if (status !== 'authenticated') {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  }

  return children
}
