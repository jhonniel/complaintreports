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

function publicSiteUrl(origins: string[]) {
  const configured = required('PUBLIC_SITE_URL')
  if (configured) return configured.replace(/\/$/, '')
  const vercelProd = asHttpsOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL)
  if (vercelProd) return vercelProd
  const httpsOrigin = origins.find((origin) => origin.startsWith('https://'))
  if (httpsOrigin) return httpsOrigin
  return origins[0] ?? 'http://localhost:5173'
}

const clientOrigins = parseOrigins()

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3001),
  clientOrigins,
  publicSiteUrl: publicSiteUrl(clientOrigins),
  captchaSecret: required('CAPTCHA_SECRET_KEY'),
  supabaseUrl: required('SUPABASE_URL') ?? required('VITE_SUPABASE_URL'),
  supabaseAnonKey: required('SUPABASE_ANON_KEY') ?? required('VITE_SUPABASE_ANON_KEY'),
  supabaseServiceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  devAdminEmail: required('DEV_ADMIN_EMAIL'),
  devAdminPassword: required('DEV_ADMIN_PASSWORD'),
  tomtomApiKey: required('TOMTOM_API_KEY') ?? required('VITE_TOMTOM_API_KEY'),
  resendApiKey: required('RESEND_API_KEY'),
  resendFrom: required('RESEND_FROM') ?? 'Tingog Page <report@tingogkidapawan.com>',
  spacesKey: required('DIGITALOCEAN_SPACES_KEY'),
  spacesSecret: required('DIGITALOCEAN_SPACES_SECRET'),
  spacesEndpoint: (required('DIGITALOCEAN_SPACES_ENDPOINT') ?? '').replace(/\/+$/, ''),
  spacesRegion: required('DIGITALOCEAN_SPACES_REGION') ?? 'sgp1',
  spacesBucket: required('DIGITALOCEAN_SPACES_BUCKET'),
  spacesPublicBase: (required('DIGITALOCEAN_SPACES_PATH') ?? '').replace(/\/+$/, ''),
  spacesRootPath: (required('DIGITALOCEAN_SPACES_ROOT_PATH') ?? 'tingog/reports').replace(/^\/+|\/+$/g, ''),
  spacesExpirationMinutes: Math.max(5, Number(process.env.DIGITALOCEAN_SPACES_EXPIRATION ?? 30) || 30),
  facebookAccessToken: required('FACEBOOK_ACCESS_TOKEN'),
  facebookPageId: required('FACEBOOK_PAGE_ID'),
  facebookAppId: required('FACEBOOK_APP_ID'),
  facebookAppSecret: required('FACEBOOK_APP_SECRET'),
  isVercel: process.env.VERCEL === '1',
}

export const isProduction = env.nodeEnv === 'production'
export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey)
export const isSpacesConfigured = Boolean(
  env.spacesKey && env.spacesSecret && env.spacesEndpoint && env.spacesBucket,
)
export const hasServiceRole = Boolean(env.supabaseServiceRoleKey)
export const isDevAdminEnabled = Boolean(
  !isProduction && !env.isVercel && env.devAdminEmail && env.devAdminPassword,
)

export function isAllowedOrigin(origin: string | undefined) {
  if (!origin) return true
  if (env.clientOrigins.includes(origin)) return true
  if (!isProduction && isLocalDevOrigin(origin)) return true
  return false
}

function isLocalDevOrigin(origin: string) {
  try {
    const url = new URL(origin)
    if (url.protocol !== 'http:') return false
    const host = url.hostname
    if (host === 'localhost' || host === '127.0.0.1') return true
    const parts = host.split('.').map(Number)
    if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) return false
    const [first, second] = parts
    return first === 10 || (first === 192 && second === 168) || (first === 172 && second >= 16 && second <= 31)
  } catch {
    return false
  }
}
