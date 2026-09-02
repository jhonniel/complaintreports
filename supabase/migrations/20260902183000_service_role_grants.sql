-- Allow the Express API (service_role) to create tickets and reports.
-- Phase 2 revoked public execute on next_ticket_number; this restores it for the API.

grant usage on schema public to service_role;

grant all on table public.reports to service_role;
grant all on table public.ticket_counters to service_role;
grant all on table public.report_status_history to service_role;
grant all on table public.report_categories to service_role;
grant all on table public.departments to service_role;
grant all on table public.report_notes to service_role;
grant all on table public.access_logs to service_role;
grant all on table public.profiles to service_role;

grant execute on function public.next_ticket_number() to service_role;
