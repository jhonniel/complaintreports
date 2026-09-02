import { KIDAPAWAN_CENTER } from '@shared/map'

export const TOMTOM_API_KEY = import.meta.env.VITE_TOMTOM_API_KEY ?? ''
export const isTomTomConfigured = TOMTOM_API_KEY.trim().length > 0
export { KIDAPAWAN_CENTER }
