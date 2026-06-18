-- Avoid anonymous access inherited through the PostgreSQL PUBLIC pseudo-role.
-- Re-grant the application schema only to authenticated users.

revoke all privileges on schema public from public;
revoke all privileges on all tables in schema public from public;
revoke all privileges on all sequences in schema public from public;
revoke all privileges on all functions in schema public from public;

grant usage on schema public to authenticated;
grant select, insert, update on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on function public.current_organization_id() to authenticated;
grant execute on function public.current_app_role() to authenticated;
grant execute on function public.can_write_operational() to authenticated;
grant execute on function public.can_validate() to authenticated;
