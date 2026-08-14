-- Coffee Passport: Sprint 3E, the public social surface.
-- Run once in the SQL Editor, after drink_logs_visibility.sql.
-- Additive only.
--
-- Both functions below are the ONLY way public log data ever leaves
-- the database. drink_logs SELECT RLS stays owner-only, untouched,
-- these are SECURITY DEFINER functions that internally filter to
-- visibility = 'public' and return only explicitly-approved columns,
-- never a raw row, never price/size/shop_rating, never a private
-- caption (private logs never match the filter, so their captions
-- never reach either function), never a profile field beyond
-- username/first_name/avatar_url. profiles RLS itself remains
-- owner-only, these functions are the narrow public-identity surface
-- for Sprint 3E, not a general profile lookup, that's Sprint 3F's job
-- once real profile pages exist.

create or replace function public.get_public_feed(
  cursor_logged_at timestamptz default null,
  cursor_created_at timestamptz default null,
  cursor_id uuid default null,
  page_size integer default 20
)
returns table (
  log_id uuid,
  logged_at timestamptz,
  created_at timestamptz,
  drink_rating numeric,
  caption text,
  temperature text,
  photo_path text,
  drink_id uuid,
  drink_name text,
  category text,
  shop_id uuid,
  shop_name text,
  username text,
  first_name text,
  avatar_url text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    dl.id as log_id,
    dl.logged_at,
    dl.created_at,
    dl.drink_rating,
    dl.caption,
    dl.temperature,
    dl.photo_url as photo_path,
    d.id as drink_id,
    d.name as drink_name,
    d.category,
    s.id as shop_id,
    s.name as shop_name,
    p.username,
    p.first_name,
    p.avatar_url
  from public.drink_logs dl
  join public.drinks d on d.id = dl.drink_id
  join public.shops s on s.id = dl.shop_id
  join public.profiles p on p.id = dl.user_id
  where dl.visibility = 'public'
    and (
      cursor_logged_at is null
      or (dl.logged_at, dl.created_at, dl.id) < (cursor_logged_at, cursor_created_at, cursor_id)
    )
  order by dl.logged_at desc, dl.created_at desc, dl.id desc
  limit greatest(1, least(page_size, 50));
$$;

revoke all on function public.get_public_feed(timestamptz, timestamptz, uuid, integer) from public;
revoke all on function public.get_public_feed(timestamptz, timestamptz, uuid, integer) from anon;
grant execute on function public.get_public_feed(timestamptz, timestamptz, uuid, integer) to authenticated;

-- Same approved field set, scoped to one café, no pagination needed
-- for this MVP (a capped recent list is enough for "what people are
-- drinking here"). shop identity is omitted since the caller is
-- already on that shop's own page.
create or replace function public.get_shop_public_activity(
  target_shop_id uuid,
  result_limit integer default 12
)
returns table (
  log_id uuid,
  logged_at timestamptz,
  drink_rating numeric,
  caption text,
  temperature text,
  photo_path text,
  drink_id uuid,
  drink_name text,
  category text,
  username text,
  first_name text,
  avatar_url text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    dl.id as log_id,
    dl.logged_at,
    dl.drink_rating,
    dl.caption,
    dl.temperature,
    dl.photo_url as photo_path,
    d.id as drink_id,
    d.name as drink_name,
    d.category,
    p.username,
    p.first_name,
    p.avatar_url
  from public.drink_logs dl
  join public.drinks d on d.id = dl.drink_id
  join public.profiles p on p.id = dl.user_id
  where dl.shop_id = target_shop_id
    and dl.visibility = 'public'
  order by dl.logged_at desc, dl.created_at desc, dl.id desc
  limit greatest(1, least(result_limit, 50));
$$;

revoke all on function public.get_shop_public_activity(uuid, integer) from public;
revoke all on function public.get_shop_public_activity(uuid, integer) from anon;
grant execute on function public.get_shop_public_activity(uuid, integer) to authenticated;

-- Photo access for the social surface. Additive alongside the existing
-- owner-only policy in drink_photos_storage.sql, never a replacement.
--
-- This cannot be a raw subquery inside the storage policy itself. A
-- subquery there still runs under the querying user's own privileges,
-- so it would be subject to drink_logs' own owner-only SELECT RLS and
-- would never actually see another user's row, silently granting
-- nothing. A narrow SECURITY DEFINER function is what lets this check
-- see across that boundary safely: it can confirm a public log exists
-- for a given path without drink_logs RLS ever being loosened, and it
-- returns only a boolean, never any row data.
create or replace function public.is_public_drink_photo(target_path text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.drink_logs dl
    where dl.photo_url = target_path
    and dl.visibility = 'public'
  );
$$;

revoke all on function public.is_public_drink_photo(text) from public;
revoke all on function public.is_public_drink_photo(text) from anon;
grant execute on function public.is_public_drink_photo(text) to authenticated;

-- An object becomes readable to any authenticated user only while some
-- drink_logs row references that exact path AND is currently public,
-- the instant a log flips to private or is deleted, this stops
-- matching and access disappears on the next request.
--
-- Honest note on signed URLs: this policy governs whether a NEW signed
-- URL can be issued, it cannot revoke a URL already handed to a
-- browser. Discover and café public-activity signed URLs are
-- deliberately short-lived (5 minutes) specifically to keep that
-- exposure window small after a public-to-private change, not because
-- of any technical requirement, this is a privacy choice.
create policy "Anyone can view photos from public logs"
on storage.objects for select
to authenticated
using (
  bucket_id = 'drink-photos'
  and public.is_public_drink_photo(name)
);
