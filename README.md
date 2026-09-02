# Tingog Page

Civic complaint and report management for Kidapawan City.

Residents submit reports without creating an account. Authorized administrators review tickets, statistics, and map locations.

## Current phase

**Phase 12 — Production**

The app is ready to deploy on Vercel with hosted Supabase and TomTom. Public submit and track still do not require an account. Personal information stays off public pages. Production refuses the local JSON store; the API needs `SUPABASE_SERVICE_ROLE_KEY`. This is the last planned build phase.

## First administrator

1. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`. Use the same URL and anon key on the server (`SUPABASE_URL`, `SUPABASE_ANON_KEY`). Keep `SUPABASE_SERVICE_ROLE_KEY` server-only.
2. Run the SQL in `supabase/migrations/` in order (reports, profiles, notes, access logs, then security grants).
3. Create a user in Supabase Authentication.
4. Insert a profile row with `role` of `super_admin`, `admin`, or `staff`.

## Requirements

- Node.js 20 or later
- npm

## Setup

```bash
copy .env.example .env
npm install
npm run dev
```

The web app runs at [http://localhost:5173](http://localhost:5173). The API runs at [http://localhost:3001](http://localhost:3001). Vite proxies `/api` to the Express server.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Frontend and API together |
| `npm run dev:web` | Vite only |
| `npm run dev:api` | Express API only |
| `npm run check` | Frontend and server TypeScript |
| `npm run build` | Production frontend build |
| `npm run preview` | Preview the production build |

## Environment variables

Copy `.env.example` to `.env`. Never commit `.env`.

Frontend-safe variables use the `VITE_` prefix. The Supabase service role key is server-only and must never be used in the browser. Get a TomTom key at [my.tomtom.com](https://my.tomtom.com) and set `VITE_TOMTOM_API_KEY`.

## API

| Method | Path | Status |
| --- | --- | --- |
| GET | `/api/health` | Live |
| GET | `/api/categories` | Live |
| POST | `/api/reports` | Live |
| GET | `/api/reports/track/:ticketNumber` | Live |
| POST | `/api/access-logs` | Live |
| GET | `/api/admin/me` | Live, requires admin JWT |
| GET | `/api/admin/analytics` | Live, requires admin JWT; includes department and rounded geographic aggregates |
| GET | `/api/admin/reports` | Live, requires admin JWT |
| GET | `/api/admin/reports/:ticketNumber` | Live, requires admin JWT |
| PATCH | `/api/admin/reports/:ticketNumber/status` | Live, requires admin JWT |
| PATCH | `/api/admin/reports/:ticketNumber/priority` | Live, requires admin JWT |
| PATCH | `/api/admin/reports/:ticketNumber/assign` | Live, requires admin JWT |
| POST | `/api/admin/reports/:ticketNumber/notes` | Live, requires admin JWT |
| GET | `/api/admin/departments` | Live, requires admin JWT |
| POST | `/api/admin/departments` | Live, requires admin JWT |
| PATCH | `/api/admin/departments/:id` | Live, requires admin JWT |
| GET | `/api/admin/categories` | Live, requires admin JWT |
| POST | `/api/admin/categories` | Live, requires admin JWT |
| PATCH | `/api/admin/categories/:id` | Live, requires admin JWT |
| GET | `/api/admin/staff` | Live, requires admin JWT |
| GET | `/api/admin/map/reports` | Live, requires admin JWT |
| GET | `/api/admin/map/access` | Live, requires admin JWT |
| GET | `/api/admin/*` | Auth required; remaining resources reserved (501) |

Without Supabase credentials in **development**, reports are stored locally in `server/data/local-store.json` (gitignored). Production never uses that file. With `SUPABASE_SERVICE_ROLE_KEY`, the API uses PostgreSQL. Run the SQL files in `supabase/migrations/` before using the hosted database.

## Deployment

Deploy the Vite frontend and Express API together on Vercel. The API is a serverless function at `api/index.ts` and `api/[...slug].ts` so `/api/health` and nested routes keep their paths.

### 1. Hosted database

In the [Supabase SQL editor](https://supabase.com/dashboard), run these files **in order**:

1. `supabase/migrations/20260902120000_phase2_reports.sql`
2. `supabase/migrations/20260902160900_phase4_profiles.sql`
3. `supabase/migrations/20260902161900_phase6_report_notes.sql`
4. `supabase/migrations/20260902163600_phase7_access_logs.sql`
5. `supabase/migrations/20260902170000_phase10_security.sql`

Then create the first administrator (see **First administrator** above).

### 2. TomTom

1. Create a key at [my.tomtom.com](https://my.tomtom.com).
2. Restrict it to HTTP referrers for your production domain (and `http://localhost:*` for local work).
3. Set `VITE_TOMTOM_API_KEY` in Vercel. Do not put other TomTom secrets in `VITE_*` variables.

### 3. Vercel project

1. Import this repository in Vercel.
2. Framework preset: Vite. Build command: `npm run build`. Output directory: `dist`. Node.js 20.
3. Add environment variables for Production (and Preview if you use preview URLs):

| Variable | Where it is used | Notes |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Frontend + server fallback | Project URL |
| `VITE_SUPABASE_ANON_KEY` | Frontend + server fallback | Public anon key |
| `VITE_TOMTOM_API_KEY` | Frontend map | Referrer-restricted |
| `VITE_API_BASE_URL` | Frontend | Use `/api` on Vercel |
| `SUPABASE_URL` | Server | Same as the project URL |
| `SUPABASE_ANON_KEY` | Server | Same as the anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Required in production. Never prefix with `VITE_` |
| `CLIENT_ORIGIN` | Server CORS | `https://your-production-domain` (comma-separated if needed) |

Vercel also injects `VERCEL_URL` and `VERCEL_PROJECT_PRODUCTION_URL`. Those HTTPS origins are allowed automatically so the first deploy can call the API before a custom domain is set.

4. Deploy. Confirm `GET /api/health` returns `"phase": 12` and `"status": "ok"` with `"storage": "supabase"`. If the service role key is missing, health returns **503** and `"status": "degraded"`.

### 4. After go-live

- Point a custom domain at the Vercel project and add that origin to `CLIENT_ORIGIN`.
- Confirm public submit and track work without an account.
- Confirm `/api/admin/*` returns **401** without a token.
- Do not commit `.env`, `.vercel`, or `server/data/*.json`.

### Security notes

- Public APIs return ticket-safe fields only. Names, phones, and exact coordinates are not sent to public pages or analytics payloads.
- Row Level Security is forced in the Phase 10 migration. Anon and authenticated roles cannot read PII tables through the public anon key.
- Rate limits are in-memory per serverless instance. They reduce abuse; they are not a shared Redis quota.
- API errors stay generic. Logs redact phones, names, tokens, and coordinates.
