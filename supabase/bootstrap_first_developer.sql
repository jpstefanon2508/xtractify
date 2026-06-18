-- Bootstrap do primeiro desenvolvedor.
-- Use somente depois que o primeiro usuario for criado no Supabase Auth.
-- Substitua os placeholders antes de executar no SQL Editor.

insert into public.organizations (id, name, status)
values ('00000000-0000-0000-0000-000000000001', 'Organizacao Xtractify', 'active')
on conflict (id) do nothing;

insert into public.user_profiles (
  id,
  organization_id,
  full_name,
  email,
  role,
  status,
  requested_reason,
  approved_at
)
values (
  '<AUTH_USER_UUID>',
  '00000000-0000-0000-0000-000000000001',
  '<NOME_DO_DESENVOLVEDOR>',
  '<EMAIL_DO_DESENVOLVEDOR>',
  'developer',
  'approved',
  'Primeiro desenvolvedor do ambiente.',
  now()
)
on conflict (id) do update
set
  role = 'developer',
  status = 'approved',
  approved_at = now(),
  updated_at = now();
