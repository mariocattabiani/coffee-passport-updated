-- Coffee Passport: allows the avatar-replacement cleanup added in
-- Sprint 3B.1 to actually delete a user's own previous avatar file.
--
-- Why this is needed: the avatars bucket currently has select, insert,
-- and update policies (see storage.sql), but no delete policy. Without
-- one, Storage silently refuses any delete request, so the new
-- application-side cleanup code would run but have nothing happen,
-- old avatars would keep accumulating exactly as they do today. This
-- is additive: it does not touch the existing select/insert/update
-- policies.
--
-- Run this once in the SQL Editor.

create policy "Users can delete their own avatar"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);
