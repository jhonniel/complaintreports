import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { logPublicAccess } from '@/features/access/accessApi'
import { pingSupabaseKeepAlive } from '@/lib/keepAlive'

export function AccessTracker() {
  const location = useLocation()

  useEffect(() => {
    void logPublicAccess(location.pathname)
    pingSupabaseKeepAlive()
  }, [location.pathname])

  return null
}
