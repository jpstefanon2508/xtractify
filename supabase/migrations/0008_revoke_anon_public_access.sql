-- The app does not expose public data. Anonymous users can use Supabase Auth,
-- but public application tables require an authenticated JWT plus RLS policies.

revoke all privileges on all tables in schema public from anon;
revoke all privileges on all sequences in schema public from anon;
revoke all privileges on all functions in schema public from anon;
revoke usage on schema public from anon;
