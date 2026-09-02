-- Phase 2: reports, categories, ticket numbers, and status history.
-- Run this in the Supabase SQL editor (or via the CLI) before using the hosted database.

create extension if not exists pgcrypto;

create table if not exists public.report_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.ticket_counters (
  year integer primary key,
  last_value integer not null default 0
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  ticket_number text not null unique,
  full_name text not null,
  birth_date date not null,
  gender text not null,
  address text not null,
  phone text not null,
  email text,
  category_id uuid not null references public.report_categories (id),
  title text not null,
  description text not null,
  status text not null default 'submitted',
  priority text not null default 'medium',
  latitude double precision,
  longitude double precision,
  location_accuracy double precision,
  location_captured_at timestamptz,
  assigned_department_id uuid references public.departments (id),
  assigned_admin_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reports_gender_check check (
    gender in ('female', 'male', 'non_binary', 'prefer_not_to_say')
  ),
  constraint reports_status_check check (
    status in (
      'submitted',
      'received',
      'under_review',
      'in_progress',
      'resolved',
      'closed',
      'rejected'
    )
  ),
  constraint reports_priority_check check (
    priority in ('low', 'medium', 'high', 'urgent')
  )
);

create index if not exists reports_ticket_number_idx on public.reports (ticket_number);
create index if not exists reports_status_idx on public.reports (status);
create index if not exists reports_category_id_idx on public.reports (category_id);
create index if not exists reports_department_id_idx on public.reports (assigned_department_id);
create index if not exists reports_created_at_idx on public.reports (created_at);

create table if not exists public.report_status_history (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  previous_status text,
  new_status text not null,
  note text,
  changed_by uuid,
  created_at timestamptz not null default now()
);

insert into public.report_categories (id, name, description)
values
  ('11111111-1111-4111-8111-111111111101', 'Public Safety', 'Crime, street safety, lighting, and emergency concerns.'),
  ('11111111-1111-4111-8111-111111111102', 'Road and Transportation', 'Roads, traffic, sidewalks, and public transport.'),
  ('11111111-1111-4111-8111-111111111103', 'Infrastructure', 'Buildings, drainage, bridges, and public structures.'),
  ('11111111-1111-4111-8111-111111111104', 'Garbage / Waste Management', 'Collection, dumping, and sanitation issues.'),
  ('11111111-1111-4111-8111-111111111105', 'Water', 'Water supply, leaks, and water quality.'),
  ('11111111-1111-4111-8111-111111111106', 'Electricity', 'Power outages, lines, and electrical hazards.'),
  ('11111111-1111-4111-8111-111111111107', 'Public Services', 'General city services and community facilities.'),
  ('11111111-1111-4111-8111-111111111108', 'Government Services', 'Permits, offices, and civic service concerns.'),
  ('11111111-1111-4111-8111-111111111109', 'Health', 'Public health, clinics, and sanitation related to health.'),
  ('11111111-1111-4111-8111-111111111110', 'Environment', 'Trees, pollution, flooding, and environmental hazards.'),
  ('11111111-1111-4111-8111-111111111111', 'Other', 'Concerns that do not fit the listed categories.')
on conflict (id) do nothing;

insert into public.departments (id, name, description)
values
  ('22222222-2222-4222-8222-222222222201', 'City Engineering', 'Roads, drainage, and engineering works.'),
  ('22222222-2222-4222-8222-222222222202', 'Public Works', 'Public facilities and maintenance.'),
  ('22222222-2222-4222-8222-222222222203', 'Environment', 'Environmental protection and sanitation.'),
  ('22222222-2222-4222-8222-222222222204', 'Health', 'Public health services.'),
  ('22222222-2222-4222-8222-222222222205', 'Public Safety', 'Peace and order and emergency response.'),
  ('22222222-2222-4222-8222-222222222206', 'General Services', 'General city services.'),
  ('22222222-2222-4222-8222-222222222207', 'Other', 'Unassigned or cross-office concerns.')
on conflict (id) do nothing;

create or replace function public.next_ticket_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  current_year integer := extract(year from timezone('Asia/Manila', now()))::integer;
  next_value integer;
begin
  insert into public.ticket_counters as counters (year, last_value)
  values (current_year, 1)
  on conflict (year)
  do update set last_value = counters.last_value + 1
  returning last_value into next_value;

  return 'TP-' || current_year::text || '-' || lpad(next_value::text, 6, '0');
end;
$$;

revoke all on function public.next_ticket_number() from public, anon, authenticated;

alter table public.report_categories enable row level security;
alter table public.departments enable row level security;
alter table public.ticket_counters enable row level security;
alter table public.reports enable row level security;
alter table public.report_status_history enable row level security;

drop policy if exists "Public can read active categories" on public.report_categories;
create policy "Public can read active categories"
  on public.report_categories
  for select
  to anon, authenticated
  using (is_active = true);

-- Reports, notes, counters, and departments have no public policies.
-- The Express API uses the service role key, which bypasses RLS.
