-- Coffee Passport: adds photo_position_x/photo_position_y to
-- get_shop_public_activity — the one remaining surface that reads a
-- photo (WhatPeopleAreDrinking, on the shop page) but was left out of
-- photo_focal_position.sql, since that surface uses its own separate
-- RPC/card implementation, not the shared feed RPCs.
--
-- RUN ORDER: run after photo_focal_position.sql (drink_logs.photo_
-- position_x/y must already exist as columns).
--
-- Same additive pattern as every prior feed-RPC extension in this
-- project: DROP FUNCTION then CREATE (CREATE OR REPLACE cannot change
-- a RETURNS TABLE function's column set), no other column, join,
-- filter, or ordering change. No data altered, no backfill.

drop function if exists public.get_shop_public_activity(uuid, integer);

create function public.get_shop_public_activity(
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
