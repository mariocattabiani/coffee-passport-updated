-- Coffee Passport: Storage policies for the private drink-photos bucket.
--
-- First, in the Supabase dashboard: Storage -> New bucket -> name it
-- "drink-photos" -> leave "Public bucket" OFF. Unlike avatars, this
-- bucket stays private: drink_logs are private to their owner, so
-- drink photos follow the same privacy model. The app generates
-- short-lived signed URLs to display a user's own photos.
--
-- Then run this script in the SQL Editor.

create policy "Users can view their own drink photos"
on storage.objects for select
to authenticated
using (
  bucket_id = 'drink-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can upload their own drink photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'drink-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can replace their own drink photos"
on storage.objects for update
to authenticated
using (
  bucket_id = 'drink-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'drink-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can remove their own drink photos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'drink-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);
