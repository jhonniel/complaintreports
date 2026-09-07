/** Free Supabase pauses after about 7 days idle. This app pings at least every 4 days. */
export const KEEP_ALIVE_INTERVAL_DAYS = 4

/** 08:00 UTC on day 1, 5, 9, … — Vercel reads this from vercel.json, no extra setup. */
export const KEEP_ALIVE_CRON = '0 8 */4 * *'
