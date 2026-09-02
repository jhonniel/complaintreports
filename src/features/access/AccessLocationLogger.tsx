import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { logAccessFromBrowser } from '@/features/access/accessApi'

export function AccessLocationLogger() {
  const location = useLocation()

  useEffect(() => {
    if (sessionStorage.getItem('tingog_geo_decision') !== 'granted') return
    logAccessFromBrowser(location.pathname)
  }, [location.pathname])

  return null
}
