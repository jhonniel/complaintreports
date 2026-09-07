const SESSION_PING_KEY = 'tingog_supabase_keepalive_session'
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

export function pingSupabaseKeepAlive(force = false) {
  if (typeof sessionStorage === 'undefined') return
  if (!force && sessionStorage.getItem(SESSION_PING_KEY) === '1') return
  sessionStorage.setItem(SESSION_PING_KEY, '1')

  void fetch(`${API_BASE}/health`, {
    method: 'GET',
    cache: 'no-store',
    signal: AbortSignal.timeout(20_000),
  })
    .then((response) => {
      if (!response.ok) sessionStorage.removeItem(SESSION_PING_KEY)
    })
    .catch(() => {
      sessionStorage.removeItem(SESSION_PING_KEY)
    })
}
