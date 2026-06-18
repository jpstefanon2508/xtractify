-- Lock profile approval fields so users cannot approve or promote themselves.
-- New profiles are created by the auth trigger; developers manage status and role.

drop policy if exists "profiles request access" on public.user_profiles;
drop policy if exists "profiles update own profile" on public.user_profiles;
