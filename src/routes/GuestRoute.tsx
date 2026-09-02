import { Navigate, Outlet } from 'react-router-dom'
import { Spinner } from '@/components/ui/Spinner'
import { useAuth } from '@/features/auth/AuthProvider'

export function GuestRoute() {
  const { status } = useAuth()

  if (status === 'loading') {
    return (
      <div className="flex min-h-svh items-center justify-center bg-pine-950">
        <Spinner className="size-6 text-ink-50" />
        <span className="sr-only">Loading</span>
      </div>
    )
  }

  if (status === 'authenticated') {
    return <Navigate to="/admin/dashboard" replace />
  }

  return <Outlet />
}
