-- Link staff profiles to a department so they can act on assigned tickets.
-- Run in the Supabase SQL editor.

alter table public.profiles
  add column if not exists department_id uuid references public.departments (id) on delete set null;

create index if not exists profiles_department_id_idx on public.profiles (department_id);
