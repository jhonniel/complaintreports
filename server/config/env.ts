import 'dotenv/config'

function required(name: string, fallback?: string) {
  const value = process.env[name] ?? fallback
  return value && value.length > 0 ? value : undefined
}

function asHttpsOrigin(host: string | undefined) {
  if (!host) return undefined
  if (host.startsWith('http://') || host.startsWith('https://')) return host.replace(/\/$/, '')
  return `https://${host}`
}

function parseOrigins() {
  const configured = (process.env.CLIENT_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean)
  const vercelOrigins = [
    asHttpsOrigin(process.env.VERCEL_URL),
    asHttpsOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL),
    asHttpsOrigin(process.env.VERCEL_BRANCH_URL),
  ].filter((origin): origin is string => Boolean(origin))
  return [...new Set([...configured, ...vercelOrigins])]
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3001),
  clientOrigins: parseOrigins(),
  captchaSecret: required('CAPTCHA_SECRET_KEY'),
  supabaseUrl: required('SUPABASE_URL') ?? required('VITE_SUPABASE_URL'),
  supabaseAnonKey: required('SUPABASE_ANON_KEY') ?? required('VITE_SUPABASE_ANON_KEY'),
  supabaseServiceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  isVercel: process.env.VERCEL === '1',
}

export const isProduction = env.nodeEnv === 'production'
export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey)
export const hasServiceRole = Boolean(env.supabaseServiceRoleKey)

export function isAllowedOrigin(origin: string | undefined) {
  if (!origin) return true
  if (env.clientOrigins.includes(origin)) return true
  if (!isProduction && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) return true
  return false
}
