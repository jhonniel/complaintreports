-- Phase 10: tighten grants so public roles cannot read PII tables even if a policy is added later.
-- The Express API continues to use the service role, which bypasses RLS.

alter table public.report_categories force row level security;
alter table public.departments force row level security;
alter table public.ticket_counters force row level security;
alter table public.reports force row level security;
alter table public.report_status_history force row level security;
alter table public.profiles force row level security;
alter table public.report_notes force row level security;
alter table public.access_logs force row level security;

revoke all on table public.reports from anon, authenticated;
revoke all on table public.departments from anon, authenticated;
revoke all on table public.ticket_counters from anon, authenticated;
revoke all on table public.report_status_history from anon, authenticated;
revoke all on table public.report_notes from anon, authenticated;
revoke all on table public.access_logs from anon, authenticated;
revoke all on table public.profiles from anon, authenticated;

grant select on table public.report_categories to anon, authenticated;
grant select on table public.profiles to authenticated;

grant execute on function public.next_ticket_number() to service_role;

drop policy if exists "Admins can read own profile" on public.profiles;
create policy "Admins can read own profile"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Public can read active categories" on public.report_categories;
create policy "Public can read active categories"
  on public.report_categories
  for select
  to anon, authenticated
  using (is_active = true);

-- No insert/update/delete policies for anon or authenticated on reports, notes,
-- departments, access logs, or ticket counters. Residents submit only through the API.
