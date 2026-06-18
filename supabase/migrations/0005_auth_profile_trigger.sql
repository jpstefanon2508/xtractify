-- Ensure every Supabase Auth signup gets an application profile.
-- The profile starts pending and must be approved by a developer in the app.

create or replace function app_private.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.user_profiles (
    id,
    organization_id,
    full_name,
    email,
    role,
    status,
    requested_reason
  )
  values (
    new.id,
    '00000000-0000-0000-0000-000000000001',
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), new.email),
    new.email,
    'client',
    'pending',
    nullif(new.raw_user_meta_data ->> 'requested_reason', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_profile on auth.users;

create trigger on_auth_user_created_create_profile
after insert on auth.users
for each row
execute function app_private.create_profile_for_auth_user();

insert into public.user_profiles (
  id,
  organization_id,
  full_name,
  email,
  role,
  status,
  requested_reason
)
select
  auth_user.id,
  '00000000-0000-0000-0000-000000000001',
  coalesce(nullif(auth_user.raw_user_meta_data ->> 'full_name', ''), auth_user.email),
  auth_user.email,
  'client',
  'pending',
  nullif(auth_user.raw_user_meta_data ->> 'requested_reason', '')
from auth.users auth_user
left join public.user_profiles profiles on profiles.id = auth_user.id
where profiles.id is null
on conflict (id) do nothing;
