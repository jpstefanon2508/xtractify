-- Private Storage buckets for imports, exports and field media.
-- Requires Supabase Storage schema.

insert into storage.buckets (id, name, public)
values
  ('imports', 'imports', false),
  ('exports', 'exports', false),
  ('media', 'media', false)
on conflict (id) do nothing;

create policy "authenticated can upload import files"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'imports'
  and (storage.foldername(name))[1] = public.current_organization_id()::text
  and public.current_app_role() = 'developer'
);

create policy "authenticated can read own organization import files"
on storage.objects for select to authenticated
using (
  bucket_id = 'imports'
  and (storage.foldername(name))[1] = public.current_organization_id()::text
);

create policy "authenticated can create export files"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'exports'
  and (storage.foldername(name))[1] = public.current_organization_id()::text
);

create policy "authenticated can read own organization export files"
on storage.objects for select to authenticated
using (
  bucket_id = 'exports'
  and (storage.foldername(name))[1] = public.current_organization_id()::text
);

create policy "authenticated can update own organization export files"
on storage.objects for update to authenticated
using (
  bucket_id = 'exports'
  and (storage.foldername(name))[1] = public.current_organization_id()::text
)
with check (
  bucket_id = 'exports'
  and (storage.foldername(name))[1] = public.current_organization_id()::text
);

create policy "authenticated can upload media files"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'media'
  and (storage.foldername(name))[1] = public.current_organization_id()::text
);

create policy "authenticated can read own organization media files"
on storage.objects for select to authenticated
using (
  bucket_id = 'media'
  and (storage.foldername(name))[1] = public.current_organization_id()::text
);
