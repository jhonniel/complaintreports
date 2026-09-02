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
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { setAccessToken } from '@/services/api'

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

  const applySession = useCallback(async (userId: string | null, email: string | null, token: string | null) => {
    setAccessToken(token)
    if (!userId || !token) {
      setProfile(null)
      setStatus('anonymous')
      return
    }
    const nextProfile = await loadProfile(userId, email)
    if (!nextProfile) {
      setProfile(null)
      setAccessToken(null)
      setStatus('anonymous')
      if (supabase) await supabase.auth.signOut()
      return
    }
    setProfile(nextProfile)
    setStatus('authenticated')
  }, [])

  useEffect(() => {
    if (!supabase) {
      setStatus('anonymous')
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
  }, [applySession])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      return 'Admin sign-in is not available right now.'
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.user || !data.session) {
      return 'Invalid email or password.'
    }
    const nextProfile = await loadProfile(data.user.id, data.user.email ?? null)
    if (!nextProfile) {
      await supabase.auth.signOut()
      setAccessToken(null)
      setProfile(null)
      setStatus('anonymous')
      return 'You do not have access to the admin dashboard.'
    }
    setAccessToken(data.session.access_token)
    setProfile(nextProfile)
    setStatus('authenticated')
    return null
  }, [])

  const signOut = useCallback(async () => {
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
