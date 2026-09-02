-- Phase 6: internal notes for authorized administrators.
-- Run after the reports and profiles migrations.

create table if not exists public.report_notes (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  admin_id uuid not null,
  note text not null,
  created_at timestamptz not null default now()
);

create index if not exists report_notes_report_id_idx on public.report_notes (report_id);
create index if not exists report_notes_created_at_idx on public.report_notes (created_at);

alter table public.report_notes enable row level security;

-- No public policies. The Express API uses the service role key, which bypasses RLS.
