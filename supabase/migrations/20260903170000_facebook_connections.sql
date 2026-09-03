-- Store the connected Facebook Page token server-side. Never expose this table to anon.
-- Run in the Supabase SQL editor.

create table if not exists public.facebook_connections (
  id uuid primary key default gen_random_uuid(),
  page_id text not null unique,
  page_name text not null,
  access_token text not null,
  is_active boolean not null default true,
  connected_by uuid,
  connected_by_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists facebook_connections_active_idx
  on public.facebook_connections (is_active)
  where is_active = true;

create table if not exists public.facebook_oauth_sessions (
  id uuid primary key default gen_random_uuid(),
  state text not null unique,
  admin_user_id uuid not null,
  pages jsonb,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists facebook_oauth_sessions_expires_idx
  on public.facebook_oauth_sessions (expires_at);

alter table public.facebook_connections enable row level security;
alter table public.facebook_connections force row level security;
alter table public.facebook_oauth_sessions enable row level security;
alter table public.facebook_oauth_sessions force row level security;

revoke all on table public.facebook_connections from anon, authenticated;
revoke all on table public.facebook_oauth_sessions from anon, authenticated;
grant all on table public.facebook_connections to service_role;
grant all on table public.facebook_oauth_sessions to service_role;
