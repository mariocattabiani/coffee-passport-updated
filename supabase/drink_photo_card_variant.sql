-- Coffee Passport: owner-checked public photo access, extended to the
-- lighter "card" copy of each photo (lib/storage/photo-variants.ts).
--
-- Applied in production in two steps:
--   2026-11-11  Patch 2: added the owner-folder check
--               (split_part(target_path,'/',1) = dl.user_id::text).
--   Patch 4:    "<user>/<log>.card.jpg" is readable exactly when its
--               original "<user>/<log>.jpg" is: same public log, same
--               owner folder. Nothing else changes.
--
-- Owner access to their own card copies is already covered by the
-- existing "Users can view their own drink photos" policy (same folder).
--
-- Rollback: re-run the Patch 2 definition (this file without the CASE,
-- i.e. `where dl.photo_url = target_path`).

create or replace function public.is_public_drink_photo(target_path text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.drink_logs dl
    where dl.photo_url = (
        case
          when lower(target_path) like '%.card.jpg'
            then left(target_path, length(target_path) - length('.card.jpg')) || '.jpg'
          else target_path
        end
      )
      and dl.visibility = 'public'
      and split_part(target_path, '/', 1) = dl.user_id::text
  );
$$;

revoke all on function public.is_public_drink_photo(text) from public;
revoke all on function public.is_public_drink_photo(text) from anon;
grant execute on function public.is_public_drink_photo(text) to authenticated;
