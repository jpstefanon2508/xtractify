-- Sistema de Estratificacao Operacional
-- Core schema for Supabase PostgreSQL.
-- Apply only after creating a Supabase project and reviewing organization/region/cost.

create extension if not exists "pgcrypto";

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id),
  full_name text not null,
  email text not null,
  role text not null default 'client' check (role in ('developer', 'client', 'apurador')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  requested_reason text,
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  code text not null,
  name text not null,
  client_name text,
  location text,
  timezone text not null default 'America/Sao_Paulo',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table if not exists public.processes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  code text not null,
  name text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  code text not null,
  name text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table if not exists public.job_roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  code text not null,
  name text not null,
  status text not null default 'active',
  unique (organization_id, code)
);

create table if not exists public.blocks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  code text not null,
  name text,
  status text not null default 'active',
  unique (organization_id, code)
);

create table if not exists public.classification_id1 (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  code text not null,
  name text not null,
  color text,
  status text not null default 'active',
  unique (organization_id, code)
);

create table if not exists public.classification_id2 (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  id1_id uuid not null references public.classification_id1(id),
  code text not null,
  meaning text not null,
  status text not null default 'active',
  unique (organization_id, code)
);

create table if not exists public.uploaded_files (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  uploaded_by uuid references public.user_profiles(id),
  bucket text not null,
  storage_path text not null,
  original_name text not null,
  mime_type text,
  size_bytes bigint,
  checksum text,
  created_at timestamptz not null default now()
);

create table if not exists public.import_batches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  uploaded_file_id uuid references public.uploaded_files(id),
  imported_by uuid references public.user_profiles(id),
  type text not null check (type in ('time_entries', 'production_entries', 'classifications')),
  status text not null default 'queued',
  total_rows integer not null default 0,
  imported_rows integer not null default 0,
  rejected_rows integer not null default 0,
  message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.import_errors (
  id uuid primary key default gen_random_uuid(),
  import_batch_id uuid not null references public.import_batches(id) on delete cascade,
  row_number integer not null,
  column_name text,
  raw_value text,
  error_message text not null,
  severity text not null default 'error',
  created_at timestamptz not null default now()
);

create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  project_id uuid references public.projects(id),
  process_id uuid references public.processes(id),
  entry_date date not null,
  start_time time,
  end_time time,
  duration_hours numeric(12, 3),
  man_hours numeric(12, 3) not null check (man_hours >= 0),
  employee_id uuid references public.employees(id),
  employee_code text,
  job_role_id uuid references public.job_roles(id),
  job_role_code text,
  surveyor_name text,
  block_id uuid references public.blocks(id),
  block_code text,
  id1_code text not null,
  id2_code text not null,
  id2_meaning text,
  quantification_seq text,
  comment text,
  origin text not null default 'manual' check (origin in ('manual', 'field', 'imported')),
  status text not null default 'draft' check (status in ('draft', 'submitted', 'validated', 'rejected', 'corrected', 'imported')),
  row_hash text,
  import_batch_id uuid references public.import_batches(id),
  is_deleted boolean not null default false,
  created_by uuid references public.user_profiles(id),
  validated_by uuid references public.user_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, row_hash)
);

create table if not exists public.production_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  project_id uuid references public.projects(id),
  production_date date not null,
  quantity numeric(12, 3) not null check (quantity >= 0),
  tag text,
  length_mm numeric(12, 3),
  weight_kg numeric(12, 3),
  type text,
  block_id uuid references public.blocks(id),
  block_code text,
  weight_ton numeric(12, 6),
  origin text not null default 'manual' check (origin in ('manual', 'field', 'imported')),
  status text not null default 'validated',
  row_hash text,
  import_batch_id uuid references public.import_batches(id),
  is_deleted boolean not null default false,
  created_by uuid references public.user_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, row_hash)
);

create table if not exists public.field_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  project_id uuid references public.projects(id),
  process_id uuid references public.processes(id),
  session_date date not null,
  start_time time,
  end_time time,
  surveyor_name text,
  team_members jsonb not null default '[]'::jsonb,
  activities jsonb not null default '[]'::jsonb,
  current_activity jsonb,
  status text not null default 'draft',
  device_info jsonb,
  created_by uuid references public.user_profiles(id),
  validated_by uuid references public.user_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.time_entries
  add column if not exists field_session_id uuid references public.field_sessions(id);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  actor_id uuid references public.user_profiles(id),
  event text not null,
  entity text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.action_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  project_id uuid references public.projects(id),
  id1_code text,
  id2_code text,
  description text not null,
  owner_name text not null,
  due_date date,
  status text not null default 'open',
  expected_impact text,
  created_by uuid references public.user_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.export_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  requested_by uuid references public.user_profiles(id),
  format text not null check (format in ('xlsx', 'csv', 'pdf', 'image')),
  filters_json jsonb not null default '{}'::jsonb,
  status text not null default 'queued',
  total_rows integer not null default 0,
  storage_path text,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  expires_at timestamptz
);

create table if not exists public.generated_exports (
  id uuid primary key default gen_random_uuid(),
  export_job_id uuid not null references public.export_jobs(id) on delete cascade,
  organization_id uuid not null references public.organizations(id),
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint,
  checksum text,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create index if not exists idx_time_entries_filters on public.time_entries (organization_id, entry_date, id1_code, id2_code, employee_code, block_code, surveyor_name) where is_deleted = false;
create index if not exists idx_production_entries_filters on public.production_entries (organization_id, production_date, block_code) where is_deleted = false;
create index if not exists idx_import_batches_org_status on public.import_batches (organization_id, status, created_at desc);
create index if not exists idx_export_jobs_org_status on public.export_jobs (organization_id, status, created_at desc);

create or replace view public.vw_daily_productivity
with (security_invoker = true)
as
with hh as (
  select organization_id, project_id, process_id, entry_date as day, sum(man_hours) as hh
  from public.time_entries
  where is_deleted = false and status in ('validated', 'corrected', 'imported')
  group by organization_id, project_id, process_id, entry_date
),
qs as (
  select organization_id, project_id, production_date as day, sum(quantity) as qs
  from public.production_entries
  where is_deleted = false
  group by organization_id, project_id, production_date
)
select
  coalesce(hh.organization_id, qs.organization_id) as organization_id,
  coalesce(hh.project_id, qs.project_id) as project_id,
  hh.process_id,
  coalesce(hh.day, qs.day) as day,
  coalesce(hh.hh, 0) as hh,
  coalesce(qs.qs, 0) as qs,
  case when coalesce(qs.qs, 0) > 0 then coalesce(hh.hh, 0) / qs.qs end as rup
from hh
full outer join qs
  on qs.organization_id = hh.organization_id
 and qs.project_id is not distinct from hh.project_id
 and qs.day = hh.day;
