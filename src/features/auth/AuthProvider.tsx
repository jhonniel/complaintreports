import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { isAdminRole, type AdminRole } from '@shared/auth'
import { api, setAccessToken } from '@/services/api'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

export interface AuthProfile {
  id: string
  userId: string
  fullName: string
  role: AdminRole
  email: string | null
}

type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

interface AuthContextValue {
  status: AuthStatus
  profile: AuthProfile | null
  isConfigured: boolean
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)
const DEV_SESSION_KEY = 'tingog_dev_admin'

interface DevSessionPayload {
  access_token: string
  user_id: string
  email: string | null
  full_name: string
  role: AdminRole
  profile_id: string
}

function profileFromDev(session: DevSessionPayload): AuthProfile | null {
  if (!isAdminRole(session.role)) return null
  return {
    id: session.profile_id,
    userId: session.user_id,
    fullName: session.full_name,
    role: session.role,
    email: session.email,
  }
}

function readDevSession(): DevSessionPayload | null {
  try {
    const raw = sessionStorage.getItem(DEV_SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw) as DevSessionPayload
  } catch {
    return null
  }
}

async function loadProfile(userId: string, email: string | null): Promise<AuthProfile | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('profiles')
    .select('id, user_id, full_name, role')
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !data) return null
  const role = typeof data.role === 'string' ? data.role : ''
  if (!isAdminRole(role)) return null

  return {
    id: data.id as string,
    userId: data.user_id as string,
    fullName: data.full_name as string,
    role,
    email,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(isSupabaseConfigured ? 'loading' : 'anonymous')
  const [profile, setProfile] = useState<AuthProfile | null>(null)

  const restoreDevProfile = useCallback(() => {
    const stored = readDevSession()
    if (!stored) return false
    const nextProfile = profileFromDev(stored)
    if (!nextProfile) return false
    setAccessToken(stored.access_token)
    setProfile(nextProfile)
    setStatus('authenticated')
    return true
  }, [])

  const applySession = useCallback(
    async (userId: string | null, email: string | null, token: string | null) => {
      if (!userId || !token) {
        if (restoreDevProfile()) return
        setAccessToken(null)
        setProfile(null)
        setStatus('anonymous')
        return
      }
      setAccessToken(token)
      const nextProfile = await loadProfile(userId, email)
      if (!nextProfile) {
        setAccessToken(null)
        if (supabase) await supabase.auth.signOut()
        if (restoreDevProfile()) return
        setProfile(null)
        setStatus('anonymous')
        return
      }
      sessionStorage.removeItem(DEV_SESSION_KEY)
      setProfile(nextProfile)
      setStatus('authenticated')
    },
    [restoreDevProfile],
  )

  useEffect(() => {
    if (!supabase) {
      if (!restoreDevProfile()) setStatus('anonymous')
      return
    }

    let cancelled = false
    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      const session = data.session
      void applySession(session?.user.id ?? null, session?.user.email ?? null, session?.access_token ?? null)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      void applySession(session?.user.id ?? null, session?.user.email ?? null, session?.access_token ?? null)
    })

    return () => {
      cancelled = true
      data.subscription.unsubscribe()
    }
  }, [applySession, restoreDevProfile])

  const signIn = useCallback(async (email: string, password: string) => {
    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (!error && data.user && data.session) {
        const nextProfile = await loadProfile(data.user.id, data.user.email ?? null)
        if (nextProfile) {
          sessionStorage.removeItem(DEV_SESSION_KEY)
          setAccessToken(data.session.access_token)
          setProfile(nextProfile)
          setStatus('authenticated')
          return null
        }
        await supabase.auth.signOut()
      }
    }

    try {
      const session = await api.post<DevSessionPayload>('/dev/session', { email, password })
      const nextProfile = profileFromDev(session)
      if (!nextProfile) {
        return 'You do not have access to the admin dashboard.'
      }
      sessionStorage.setItem(DEV_SESSION_KEY, JSON.stringify(session))
      setAccessToken(session.access_token)
      setProfile(nextProfile)
      setStatus('authenticated')
      return null
    } catch {
      return 'Invalid email or password.'
    }
  }, [])

  const signOut = useCallback(async () => {
    sessionStorage.removeItem(DEV_SESSION_KEY)
    if (supabase) await supabase.auth.signOut()
    setAccessToken(null)
    setProfile(null)
    setStatus('anonymous')
  }, [])

  const value = useMemo(
    () => ({
      status,
      profile,
      isConfigured: isSupabaseConfigured,
      signIn,
      signOut,
    }),
    [status, profile, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
