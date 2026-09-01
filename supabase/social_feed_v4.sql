-- Coffee Passport: social_feed_v4 — adds shop_city/shop_state to the
-- feed RPCs so the mobile post header can show café LOCATION instead
-- of repeating the café NAME (which already appears once, correctly,
-- in the details block below the photo).
--
-- RUN ORDER: run this file after social_feed_v3.sql (it fully
-- replaces the same four functions social_feed_v3.sql defined, this
-- is simply the next revision of their return shape).
--
-- shop_city/shop_state are plain columns already on public.shops
-- (shops.city, shops.state — the same fields Passport's Coffee Map,
-- Been, and the public-profile Coffee Map already read). This file
-- does not call Google, does not persist anything new, and does not
-- touch name_source/location_source/google_place_id in any way — it
-- only widens what these four read-only functions SELECT from a
-- column that already exists and is already safely stored. Changing
-- the returned column set is a change of return type, which CREATE OR
-- REPLACE cannot do for a RETURNS TABLE function, hence DROP FUNCTION
-- first in each case, same as every prior feed-RPC extension in this
-- project. No data is altered, no backfill occurs.

drop function if exists public.get_public_feed(timestamptz, timestamptz, uuid, integer);

create function public.get_public_feed(
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
  shop_city text,
  shop_state text,
  owner_user_id uuid,
  username text,
  first_name text,
  avatar_url text,
  like_count integer,
  viewer_has_liked boolean,
  viewer_has_saved boolean,
  comment_count integer
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
    s.city as shop_city,
    s.state as shop_state,
    dl.user_id as owner_user_id,
    p.username,
    p.first_name,
    p.avatar_url,
    coalesce(lc.n, 0)::integer as like_count,
    coalesce(vl.liked, false) as viewer_has_liked,
    coalesce(vs.saved, false) as viewer_has_saved,
    coalesce(cc.n, 0)::integer as comment_count
  from public.drink_logs dl
  join public.drinks d on d.id = dl.drink_id
  join public.shops s on s.id = dl.shop_id
  join public.profiles p on p.id = dl.user_id
  left join lateral (
    select count(*) as n from public.log_likes ll where ll.drink_log_id = dl.id
  ) lc on true
  left join lateral (
    select true as liked from public.log_likes ll2
    where ll2.drink_log_id = dl.id and ll2.user_id = auth.uid()
  ) vl on true
  left join lateral (
    select true as saved from public.saves sv
    where sv.user_id = auth.uid() and sv.shop_id = dl.shop_id and sv.drink_id = dl.drink_id
  ) vs on true
  left join lateral (
    select count(*) as n from public.log_comments lcm where lcm.drink_log_id = dl.id
  ) cc on true
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

drop function if exists public.get_friends_feed(timestamptz, timestamptz, uuid, integer);

create function public.get_friends_feed(
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
  shop_city text,
  shop_state text,
  owner_user_id uuid,
  username text,
  first_name text,
  avatar_url text,
  like_count integer,
  viewer_has_liked boolean,
  viewer_has_saved boolean,
  comment_count integer
)
language sql
security definer
set search_path = public
stable
as $$
  with my_friends as (
    select case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end as friend_id
    from public.friendships f
    where f.status = 'accepted'
      and (f.requester_id = auth.uid() or f.addressee_id = auth.uid())
  )
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
    s.city as shop_city,
    s.state as shop_state,
    dl.user_id as owner_user_id,
    p.username,
    p.first_name,
    p.avatar_url,
    coalesce(lc.n, 0)::integer as like_count,
    coalesce(vl.liked, false) as viewer_has_liked,
    coalesce(vs.saved, false) as viewer_has_saved,
    coalesce(cc.n, 0)::integer as comment_count
  from public.drink_logs dl
  join my_friends mf on mf.friend_id = dl.user_id
  join public.drinks d on d.id = dl.drink_id
  join public.shops s on s.id = dl.shop_id
  join public.profiles p on p.id = dl.user_id
  left join lateral (
    select count(*) as n from public.log_likes ll where ll.drink_log_id = dl.id
  ) lc on true
  left join lateral (
    select true as liked from public.log_likes ll2
    where ll2.drink_log_id = dl.id and ll2.user_id = auth.uid()
  ) vl on true
  left join lateral (
    select true as saved from public.saves sv
    where sv.user_id = auth.uid() and sv.shop_id = dl.shop_id and sv.drink_id = dl.drink_id
  ) vs on true
  left join lateral (
    select count(*) as n from public.log_comments lcm where lcm.drink_log_id = dl.id
  ) cc on true
  where dl.visibility = 'public'
    and (
      cursor_logged_at is null
      or (dl.logged_at, dl.created_at, dl.id) < (cursor_logged_at, cursor_created_at, cursor_id)
    )
  order by dl.logged_at desc, dl.created_at desc, dl.id desc
  limit greatest(1, least(page_size, 50));
$$;

revoke all on function public.get_friends_feed(timestamptz, timestamptz, uuid, integer) from public;
revoke all on function public.get_friends_feed(timestamptz, timestamptz, uuid, integer) from anon;
grant execute on function public.get_friends_feed(timestamptz, timestamptz, uuid, integer) to authenticated;

drop function if exists public.get_public_user_activity(text, timestamptz, timestamptz, uuid, integer);

create function public.get_public_user_activity(
  target_username text,
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
  shop_city text,
  shop_state text,
  owner_user_id uuid,
  like_count integer,
  viewer_has_liked boolean,
  viewer_has_saved boolean,
  comment_count integer
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
    s.city as shop_city,
    s.state as shop_state,
    dl.user_id as owner_user_id,
    coalesce(lc.n, 0)::integer as like_count,
    coalesce(vl.liked, false) as viewer_has_liked,
    coalesce(vs.saved, false) as viewer_has_saved,
    coalesce(cc.n, 0)::integer as comment_count
  from public.drink_logs dl
  join public.profiles p on p.id = dl.user_id
  join public.drinks d on d.id = dl.drink_id
  join public.shops s on s.id = dl.shop_id
  left join lateral (
    select count(*) as n from public.log_likes ll where ll.drink_log_id = dl.id
  ) lc on true
  left join lateral (
    select true as liked from public.log_likes ll2
    where ll2.drink_log_id = dl.id and ll2.user_id = auth.uid()
  ) vl on true
  left join lateral (
    select true as saved from public.saves sv
    where sv.user_id = auth.uid() and sv.shop_id = dl.shop_id and sv.drink_id = dl.drink_id
  ) vs on true
  left join lateral (
    select count(*) as n from public.log_comments lcm where lcm.drink_log_id = dl.id
  ) cc on true
  where lower(p.username) = lower(trim(target_username))
    and dl.visibility = 'public'
    and (
      cursor_logged_at is null
      or (dl.logged_at, dl.created_at, dl.id) < (cursor_logged_at, cursor_created_at, cursor_id)
    )
  order by dl.logged_at desc, dl.created_at desc, dl.id desc
  limit greatest(1, least(page_size, 50));
$$;

revoke all on function public.get_public_user_activity(text, timestamptz, timestamptz, uuid, integer) from public;
revoke all on function public.get_public_user_activity(text, timestamptz, timestamptz, uuid, integer) from anon;
grant execute on function public.get_public_user_activity(text, timestamptz, timestamptz, uuid, integer) to authenticated;

drop function if exists public.get_public_log(uuid);

create function public.get_public_log(target_log_id uuid)
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
  shop_id uuid,
  shop_name text,
  shop_city text,
  shop_state text,
  owner_user_id uuid,
  username text,
  first_name text,
  avatar_url text,
  like_count integer,
  viewer_has_liked boolean,
  viewer_has_saved boolean,
  comment_count integer
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
    s.id as shop_id,
    s.name as shop_name,
    s.city as shop_city,
    s.state as shop_state,
    dl.user_id as owner_user_id,
    p.username,
    p.first_name,
    p.avatar_url,
    coalesce(lc.n, 0)::integer as like_count,
    coalesce(vl.liked, false) as viewer_has_liked,
    coalesce(vs.saved, false) as viewer_has_saved,
    coalesce(cc.n, 0)::integer as comment_count
  from public.drink_logs dl
  join public.drinks d on d.id = dl.drink_id
  join public.shops s on s.id = dl.shop_id
  join public.profiles p on p.id = dl.user_id
  left join lateral (
    select count(*) as n from public.log_likes ll where ll.drink_log_id = dl.id
  ) lc on true
  left join lateral (
    select true as liked from public.log_likes ll2
    where ll2.drink_log_id = dl.id and ll2.user_id = auth.uid()
  ) vl on true
  left join lateral (
    select true as saved from public.saves sv
    where sv.user_id = auth.uid() and sv.shop_id = dl.shop_id and sv.drink_id = dl.drink_id
  ) vs on true
  left join lateral (
    select count(*) as n from public.log_comments lcm where lcm.drink_log_id = dl.id
  ) cc on true
  where dl.id = target_log_id
    and dl.visibility = 'public';
$$;

revoke all on function public.get_public_log(uuid) from public;
revoke all on function public.get_public_log(uuid) from anon;
grant execute on function public.get_public_log(uuid) to authenticated;
