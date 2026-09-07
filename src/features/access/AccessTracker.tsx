import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { logPublicAccess } from '@/features/access/accessApi'

export function AccessTracker() {
  const location = useLocation()

  useEffect(() => {
    void logPublicAccess(location.pathname)
  }, [location.pathname])

  return null
}
