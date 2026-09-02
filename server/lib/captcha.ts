import { env } from '../config/env.ts'

/** When CAPTCHA_SECRET_KEY is unset, honeypot-only checks remain in place. */
export function captchaAccepted(token: string | undefined) {
  if (!env.captchaSecret) return true
  return Boolean(token && token.length > 8)
}
