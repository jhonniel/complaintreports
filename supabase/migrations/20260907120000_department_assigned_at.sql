-- Track when a ticket was given to a department so staff can age the queue.
-- Run in the Supabase SQL editor.

alter table public.reports
  add column if not exists department_assigned_at timestamptz;

update public.reports
set department_assigned_at = coalesce(updated_at, created_at)
where assigned_department_id is not null
  and department_assigned_at is null;

create index if not exists reports_department_assigned_at_idx
  on public.reports (department_assigned_at);
