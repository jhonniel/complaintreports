-- Phase 4: administrator profiles for Supabase Auth.
-- Create the auth user in Supabase Authentication first, then insert a matching profile.

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  full_name text not null,
  role text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_check check (role in ('super_admin', 'admin', 'staff'))
);

create index if not exists profiles_user_id_idx on public.profiles (user_id);
create index if not exists profiles_role_idx on public.profiles (role);

alter table public.profiles enable row level security;

drop policy if exists "Admins can read own profile" on public.profiles;
create policy "Admins can read own profile"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Authenticated users cannot insert or change roles from the client.
-- Create the first administrator after adding a user in Authentication > Users:
--
-- insert into public.profiles (user_id, full_name, role)
-- values ('00000000-0000-0000-0000-000000000000', 'City Administrator', 'super_admin');
