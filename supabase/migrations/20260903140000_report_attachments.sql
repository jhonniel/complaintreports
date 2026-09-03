-- Report photos stored in DigitalOcean Spaces. Keys only live in the database.
-- Run this in the Supabase SQL editor before submitting reports with photos.

create table if not exists public.report_attachments (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  storage_key text not null,
  content_type text not null,
  byte_size integer not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint report_attachments_type_check check (
    content_type in ('image/jpeg', 'image/png', 'image/webp')
  ),
  constraint report_attachments_size_check check (
    byte_size > 0 and byte_size <= 4194304
  ),
  constraint report_attachments_order_check check (
    sort_order >= 0 and sort_order < 5
  )
);

create unique index if not exists report_attachments_report_key_idx
  on public.report_attachments (report_id, storage_key);
create index if not exists report_attachments_report_id_idx
  on public.report_attachments (report_id);

alter table public.report_attachments enable row level security;
alter table public.report_attachments force row level security;

revoke all on table public.report_attachments from anon, authenticated;
grant all on table public.report_attachments to service_role;
