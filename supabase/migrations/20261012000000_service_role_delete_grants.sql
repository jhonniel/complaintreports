-- Catch-up grants so the API can delete reports and related rows.
-- Safe to re-run in the Supabase SQL editor.

grant usage on schema public to service_role;

grant all on table public.reports to service_role;
grant all on table public.ticket_counters to service_role;
grant all on table public.report_status_history to service_role;
grant all on table public.report_categories to service_role;
grant all on table public.departments to service_role;
grant all on table public.report_notes to service_role;
grant all on table public.access_logs to service_role;
grant all on table public.profiles to service_role;

do $$
begin
  if to_regclass('public.report_attachments') is not null then
    execute 'grant all on table public.report_attachments to service_role';
  end if;
  if to_regclass('public.facebook_intakes') is not null then
    execute 'grant all on table public.facebook_intakes to service_role';
  end if;
  if to_regclass('public.facebook_connections') is not null then
    execute 'grant all on table public.facebook_connections to service_role';
  end if;
  if to_regclass('public.facebook_oauth_sessions') is not null then
    execute 'grant all on table public.facebook_oauth_sessions to service_role';
  end if;
end $$;

grant execute on function public.next_ticket_number() to service_role;
