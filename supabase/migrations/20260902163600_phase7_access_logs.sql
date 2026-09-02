-- Phase 7: public access locations for the admin map (aggregated on read).
-- Run after the reports migration. No public policies; the API uses the service role.

create table if not exists public.access_logs (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  latitude double precision not null,
  longitude double precision not null,
  accuracy double precision,
  page text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists access_logs_created_at_idx on public.access_logs (created_at);
create index if not exists access_logs_session_id_idx on public.access_logs (session_id);

alter table public.access_logs enable row level security;
