-- Fix mutable search_path warnings on public helper functions used by RLS.

create or replace function public.current_organization_id()
returns uuid
language sql
stable
set search_path = public, auth
as $$
  select app_private.current_organization_id()
$$;

create or replace function public.current_app_role()
returns text
language sql
stable
set search_path = public, auth
as $$
  select app_private.current_app_role()
$$;

create or replace function public.can_write_operational()
returns boolean
language sql
stable
set search_path = public, auth
as $$
  select public.current_app_role() in ('developer', 'apurador')
$$;

create or replace function public.can_validate()
returns boolean
language sql
stable
set search_path = public, auth
as $$
  select public.current_app_role() = 'developer'
$$;
