-- Create the first Tingog Page administrator in Auth + public.profiles.
-- Run this in the Supabase SQL editor after the files in supabase/migrations/.
-- Change admin_email and admin_password before you run it.

create extension if not exists pgcrypto with schema extensions;

do $$
declare
  admin_email text := 'admin@kidapawan.gov.ph';
  admin_password text := 'CHANGE_ME';
  admin_name text := 'City Administrator';
  new_user_id uuid;
begin
  if admin_password = 'CHANGE_ME' then
    raise exception 'Set admin_password before running this script.';
  end if;

  select id into new_user_id from auth.users where email = admin_email;

  if new_user_id is null then
    new_user_id := gen_random_uuid();

    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      new_user_id,
      'authenticated',
      'authenticated',
      admin_email,
      extensions.crypt(admin_password, extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', admin_name),
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    insert into auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) values (
      gen_random_uuid(),
      new_user_id,
      jsonb_build_object('sub', new_user_id::text, 'email', admin_email),
      'email',
      new_user_id::text,
      now(),
      now(),
      now()
    );
  end if;

  insert into public.profiles (user_id, full_name, role)
  values (new_user_id, admin_name, 'super_admin')
  on conflict (user_id) do update
    set full_name = excluded.full_name,
        role = excluded.role,
        updated_at = now();
end
$$;
