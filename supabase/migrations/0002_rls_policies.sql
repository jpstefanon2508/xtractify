-- RLS policies for Supabase Data API.
-- Review with the Supabase security checklist before production.

alter table public.organizations enable row level security;
alter table public.user_profiles enable row level security;
alter table public.projects enable row level security;
alter table public.processes enable row level security;
alter table public.employees enable row level security;
alter table public.job_roles enable row level security;
alter table public.blocks enable row level security;
alter table public.classification_id1 enable row level security;
alter table public.classification_id2 enable row level security;
alter table public.uploaded_files enable row level security;
alter table public.import_batches enable row level security;
alter table public.import_errors enable row level security;
alter table public.time_entries enable row level security;
alter table public.production_entries enable row level security;
alter table public.field_sessions enable row level security;
alter table public.audit_logs enable row level security;
alter table public.action_items enable row level security;
alter table public.export_jobs enable row level security;
alter table public.generated_exports enable row level security;

create or replace function public.current_organization_id()
returns uuid
language sql
stable
as $$
  select organization_id
  from public.user_profiles
  where id = auth.uid()
    and status = 'approved'
  limit 1
$$;

create or replace function public.current_app_role()
returns text
language sql
stable
as $$
  select role
  from public.user_profiles
  where id = auth.uid()
    and status = 'approved'
  limit 1
$$;

create or replace function public.can_write_operational()
returns boolean
language sql
stable
as $$
  select public.current_app_role() in ('developer', 'apurador')
$$;

create or replace function public.can_validate()
returns boolean
language sql
stable
as $$
  select public.current_app_role() = 'developer'
$$;

create policy "profiles see own organization profiles"
on public.user_profiles for select to authenticated
using (id = auth.uid() or organization_id = public.current_organization_id());

create policy "profiles request access"
on public.user_profiles for insert to authenticated
with check (id = auth.uid() and status = 'pending');

create policy "profiles update own profile"
on public.user_profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "profiles managed by developer"
on public.user_profiles for update to authenticated
using (organization_id = public.current_organization_id() and public.current_app_role() = 'developer')
with check (organization_id = public.current_organization_id() and public.current_app_role() = 'developer');

create policy "organizations visible by members"
on public.organizations for select to authenticated
using (id = public.current_organization_id());

create policy "projects visible by organization"
on public.projects for select to authenticated
using (organization_id = public.current_organization_id());

create policy "projects managed by developer"
on public.projects for all to authenticated
using (organization_id = public.current_organization_id() and public.current_app_role() = 'developer')
with check (organization_id = public.current_organization_id() and public.current_app_role() = 'developer');

create policy "processes organization access"
on public.processes for all to authenticated
using (organization_id = public.current_organization_id())
with check (organization_id = public.current_organization_id() and public.current_app_role() = 'developer');

create policy "masters organization select"
on public.employees for select to authenticated
using (organization_id = public.current_organization_id());

create policy "masters organization write employees"
on public.employees for all to authenticated
using (organization_id = public.current_organization_id() and public.current_app_role() = 'developer')
with check (organization_id = public.current_organization_id() and public.current_app_role() = 'developer');

create policy "job roles organization access"
on public.job_roles for all to authenticated
using (organization_id = public.current_organization_id())
with check (organization_id = public.current_organization_id() and public.current_app_role() = 'developer');

create policy "blocks organization access"
on public.blocks for all to authenticated
using (organization_id = public.current_organization_id())
with check (organization_id = public.current_organization_id() and public.current_app_role() = 'developer');

create policy "classification id1 organization access"
on public.classification_id1 for all to authenticated
using (organization_id = public.current_organization_id())
with check (organization_id = public.current_organization_id() and public.current_app_role() = 'developer');

create policy "classification id2 organization access"
on public.classification_id2 for all to authenticated
using (organization_id = public.current_organization_id())
with check (organization_id = public.current_organization_id() and public.current_app_role() = 'developer');

create policy "time entries select by organization"
on public.time_entries for select to authenticated
using (organization_id = public.current_organization_id());

create policy "time entries insert by allowed roles"
on public.time_entries for insert to authenticated
with check (organization_id = public.current_organization_id() and public.can_write_operational());

create policy "time entries update by allowed roles"
on public.time_entries for update to authenticated
using (organization_id = public.current_organization_id() and public.can_write_operational())
with check (organization_id = public.current_organization_id() and public.can_write_operational());

create policy "production entries select by organization"
on public.production_entries for select to authenticated
using (organization_id = public.current_organization_id());

create policy "production entries write by allowed roles"
on public.production_entries for all to authenticated
using (organization_id = public.current_organization_id() and public.current_app_role() = 'developer')
with check (organization_id = public.current_organization_id() and public.current_app_role() = 'developer');

create policy "field sessions organization access"
on public.field_sessions for all to authenticated
using (organization_id = public.current_organization_id() and public.can_write_operational())
with check (organization_id = public.current_organization_id() and public.can_write_operational());

create policy "imports select organization"
on public.import_batches for select to authenticated
using (organization_id = public.current_organization_id());

create policy "imports write developer"
on public.import_batches for all to authenticated
using (organization_id = public.current_organization_id() and public.current_app_role() = 'developer')
with check (organization_id = public.current_organization_id() and public.current_app_role() = 'developer');

create policy "import errors visible by batch organization"
on public.import_errors for select to authenticated
using (
  exists (
    select 1 from public.import_batches b
    where b.id = import_batch_id
      and b.organization_id = public.current_organization_id()
  )
);

create policy "uploaded files organization access"
on public.uploaded_files for all to authenticated
using (organization_id = public.current_organization_id())
with check (organization_id = public.current_organization_id());

create policy "audit select organization"
on public.audit_logs for select to authenticated
using (organization_id = public.current_organization_id());

create policy "audit insert organization"
on public.audit_logs for insert to authenticated
with check (organization_id = public.current_organization_id());

create policy "actions organization access"
on public.action_items for all to authenticated
using (organization_id = public.current_organization_id())
with check (organization_id = public.current_organization_id() and public.current_app_role() = 'developer');

create policy "export jobs organization access"
on public.export_jobs for all to authenticated
using (organization_id = public.current_organization_id())
with check (organization_id = public.current_organization_id());

create policy "generated exports organization access"
on public.generated_exports for select to authenticated
using (organization_id = public.current_organization_id());

grant usage on schema public to authenticated;
grant select on public.vw_daily_productivity to authenticated;
grant select, insert, update on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
