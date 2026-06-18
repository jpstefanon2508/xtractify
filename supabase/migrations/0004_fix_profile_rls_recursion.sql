-- Fix RLS recursion when policies need the approved profile of the current user.
-- Public helper functions remain as policy entrypoints; privileged reads live in
-- a non-exposed private schema so user_profiles can safely be queried by RLS.

create schema if not exists app_private;

revoke all on schema app_private from public;
grant usage on schema app_private to authenticated;

create or replace function app_private.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select user_profiles.organization_id
  from public.user_profiles
  where user_profiles.id = auth.uid()
    and user_profiles.status = 'approved'
  limit 1
$$;

create or replace function app_private.current_app_role()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select user_profiles.role
  from public.user_profiles
  where user_profiles.id = auth.uid()
    and user_profiles.status = 'approved'
  limit 1
$$;

revoke all on function app_private.current_organization_id() from public;
revoke all on function app_private.current_app_role() from public;
grant execute on function app_private.current_organization_id() to authenticated;
grant execute on function app_private.current_app_role() to authenticated;

create or replace function public.current_organization_id()
returns uuid
language sql
stable
as $$
  select app_private.current_organization_id()
$$;

create or replace function public.current_app_role()
returns text
language sql
stable
as $$
  select app_private.current_app_role()
$$;
