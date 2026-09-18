-- Coffee Passport: expose created_at from get_shop_public_activity and
-- get_public_log.
--
-- WHY: both RPCs already use dl.created_at internally (get_shop_public_
-- activity uses it purely as an ORDER BY tiebreak) but never actually
-- returned it as a result column. Their TS consumers (the shop page's
-- "What people are drinking" section, and the single-log detail page)
-- were therefore stuck displaying relative "posted X ago" time
-- computed from logged_at (the coffee's VISIT time) instead of
-- created_at (when the post was actually submitted) — the same
-- root-cause bug already fixed for the main Discover feed and the
-- shared LogCard component in this same pass, just blocked here by the
-- data genuinely not being available yet. This is that fix.
--
-- Additive only: one more output column each, copied verbatim from
-- each function's own current, real body (log_detail_owner_access.sql
-- for get_public_log — the actually-latest revision per this
-- project's own established run order, not social_feed_v4.sql's
-- earlier one — and shop_activity_photo_position.sql for
-- get_shop_public_activity) with created_at added in exactly two
-- places: the returns table, and the select list. No other column, no
-- join, no WHERE clause, and no other behavior changes at all.
--
-- CREATE OR REPLACE FUNCTION cannot do this: Postgres does not allow
-- CREATE OR REPLACE to change a function's RETURNS TABLE structure
-- (adding, removing, or reordering output columns), only its body —
-- attempting that here would fail outright, not silently do the wrong
-- thing, but it's still the wrong tool for this migration. The correct
-- pattern, already established elsewhere in this project
-- (shop_activity_photo_position.sql, log_detail_owner_access.sql), is
-- DROP FUNCTION IF EXISTS followed by CREATE FUNCTION, used for both
-- functions below. That still keeps this file safe to re-run: DROP
-- FUNCTION IF EXISTS is itself idempotent, and CREATE FUNCTION always
-- succeeds afterward since the prior drop guarantees a clean slate.
--
-- RUN ORDER: after log_detail_owner_access.sql and
-- shop_activity_photo_position.sql (or any later file that further
-- redefines either function), since this redefines exactly what those
-- files most recently defined, plus one column.

drop function if exists public.get_shop_public_activity(uuid, integer);

create function public.get_shop_public_activity(
  target_shop_id uuid,
  result_limit integer default 12
)
returns table (
  log_id uuid,
  logged_at timestamptz,
  created_at timestamptz,
  drink_rating numeric,
  caption text,
  temperature text,
  photo_path text,
  photo_position_x numeric,
  photo_position_y numeric,
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
    dl.created_at,
    dl.drink_rating,
    dl.caption,
    dl.temperature,
    dl.photo_url as photo_path,
    dl.photo_position_x,
    dl.photo_position_y,
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

drop function if exists public.get_public_log(uuid);

create function public.get_public_log(target_log_id uuid)
returns table (
  log_id uuid,
  logged_at timestamptz,
  created_at timestamptz,
  drink_rating numeric,
  caption text,
  temperature text,
  photo_path text,
  photo_position_x numeric,
  photo_position_y numeric,
  drink_id uuid,
  drink_name text,
  category text,
  shop_id uuid,
  shop_name text,
  shop_city text,
  shop_state text,
  owner_user_id uuid,
  visibility text,
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
    dl.photo_position_x,
    dl.photo_position_y,
    d.id as drink_id,
    d.name as drink_name,
    d.category,
    s.id as shop_id,
    s.name as shop_name,
    s.city as shop_city,
    s.state as shop_state,
    dl.user_id as owner_user_id,
    dl.visibility,
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
    and (dl.visibility = 'public' or dl.user_id = auth.uid());
$$;

revoke all on function public.get_public_log(uuid) from public;
revoke all on function public.get_public_log(uuid) from anon;
grant execute on function public.get_public_log(uuid) to authenticated;
