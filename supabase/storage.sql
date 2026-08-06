-- Coffee Passport — optional Storage setup for profile photos.
--
-- First, in the Supabase dashboard: Storage -> New bucket -> name it
-- "avatars" -> toggle "Public bucket" ON -> Create.
--
-- Then run this script in the SQL Editor. It lets anyone view avatar
-- images (they're profile photos, meant to be public) but only lets a
-- signed-in user upload into their own folder (named after their user id).

create policy "Avatar images are publicly accessible"
on storage.objects for select
using (bucket_id = 'avatars');

create policy "Users can upload their own avatar"
on storage.objects for insert
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can update their own avatar"
on storage.objects for update
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);
