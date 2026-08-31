-- Coffee Passport: Sprint "Social Phase 1" — public profile identity
-- surface (Coffee Map, Cities, Drinks) plus a small extension to the
-- existing public-profile RPC.
--
-- Run once in the SQL Editor, after public_profiles.sql. Additive and
-- safe to re-run (every function below is CREATE OR REPLACE or a
-- DROP + CREATE pair, no destructive statements, no data is altered).
--
-- Every function here follows the exact pattern already established in
-- public_profiles.sql and public_feed.sql: SECURITY DEFINER, explicit
-- column lists (never a raw row), and an internal filter to
-- `visibility = 'public'` for the target user's own drink_logs. profiles
-- and drink_logs base RLS remain owner-only and untouched throughout.
-- Every aggregate below reads from the same "public_logs" shape (this
-- user's drink_logs where visibility = 'public'), so the Map, Cities,
-- Drinks, and the profile summary can never tell a different story
-- from each other or from Recent Coffees.

-- ---------------------------------------------------------------------
-- get_public_user_profile: extended with bio (existing public identity
-- field, already shown on the owner's own Passport header) and
-- public_cities_visited (needed for the new "X coffees · X cafés · X
-- cities" summary line). Changing the returned column set is a change
-- of return type, which CREATE OR REPLACE cannot do for a RETURNS TABLE
-- function, hence the explicit DROP first. This does not touch the
-- underlying profiles/drink_logs data, only what this one read-only
-- function returns.
-- ---------------------------------------------------------------------
drop function if exists public.get_public_user_profile(text);

create function public.get_public_user_profile(target_username text)
returns table (
  user_id uuid,
  username text,
  first_name text,
  avatar_url text,
  bio text,
  friendship_state text,
  public_coffees_logged integer,
  public_cafes_visited integer,
  public_cities_visited integer,
  favorite_drink_name text,
  favorite_shop_name text
)
language sql
security definer
set search_path = public
stable
as $$
  with target as (
    select id from public.profiles where lower(username) = lower(trim(target_username))
  ),
  public_logs as (
    select dl.*
    from public.drink_logs dl
    join target t on dl.user_id = t.id
    where dl.visibility = 'public'
  ),
  drink_fav as (
    select d.name, count(*) as c, avg(pl.drink_rating) as a
    from public_logs pl
    join public.drinks d on d.id = pl.drink_id
    group by d.name
    order by c desc, a desc, d.name asc
    limit 1
  ),
  shop_fav as (
    select s.name, count(*) as c, avg(pl.shop_rating) as a
    from public_logs pl
    join public.shops s on s.id = pl.shop_id
    group by s.name
    order by c desc, a desc, s.name asc
    limit 1
  )
  select
    p.id as user_id,
    p.username,
    p.first_name,
    p.avatar_url,
    p.bio,
    case
      when auth.uid() is null then 'none'
      when p.id = auth.uid() then 'self'
      when f.status = 'accepted' then 'friends'
      when f.requester_id = auth.uid() then 'outgoing_pending'
      when f.id is not null then 'incoming_pending'
      else 'none'
    end as friendship_state,
    (select count(*) from public_logs where beverage_category = 'coffee')::integer,
    (select count(distinct shop_id) from public_logs)::integer,
    (
      select count(distinct s.city)
      from public_logs pl
      join public.shops s on s.id = pl.shop_id
      where s.city is not null and length(trim(s.city)) > 0
    )::integer,
    (select name from drink_fav),
    (select name from shop_fav)
  from public.profiles p
  join target t on t.id = p.id
  left join public.friendships f
    on f.user_low = least(p.id, auth.uid())
   and f.user_high = greatest(p.id, auth.uid());
$$;

revoke all on function public.get_public_user_profile(text) from public;
revoke all on function public.get_public_user_profile(text) from anon;
grant execute on function public.get_public_user_profile(text) to authenticated;

-- ---------------------------------------------------------------------
-- get_public_user_map: café pins for the always-visible public profile
-- map. One row per café (aggregated, never one row per log), café
-- identity only, no user GPS, no chronological trail. Shops with a
-- null latitude/longitude (the conservative Google-persistence
-- architecture allows this) are excluded here entirely — those logs
-- still show up normally in Recent Coffees via the existing
-- get_public_user_activity, this function is map-only.
-- ---------------------------------------------------------------------
create or replace function public.get_public_user_map(target_username text)
returns table (
  shop_id uuid,
  shop_name text,
  city text,
  state text,
  latitude numeric,
  longitude numeric,
  public_visit_count integer,
  latest_public_visit timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  with target as (
    select id from public.profiles where lower(username) = lower(trim(target_username))
  ),
  public_logs as (
    select dl.*
    from public.drink_logs dl
    join target t on dl.user_id = t.id
    where dl.visibility = 'public'
  )
  select
    s.id as shop_id,
    s.name as shop_name,
    s.city,
    s.state,
    s.latitude,
    s.longitude,
    count(*)::integer as public_visit_count,
    max(pl.logged_at) as latest_public_visit
  from public_logs pl
  join public.shops s on s.id = pl.shop_id
  where s.latitude is not null and s.longitude is not null
  group by s.id, s.name, s.city, s.state, s.latitude, s.longitude
  order by count(*) desc, s.name asc;
$$;

revoke all on function public.get_public_user_map(text) from public;
revoke all on function public.get_public_user_map(text) from anon;
grant execute on function public.get_public_user_map(text) to authenticated;

-- ---------------------------------------------------------------------
-- get_public_user_cities: "where does this person publicly drink
-- coffee", grouped by city. Shops with no city on file are excluded
-- from this breakdown (not shown as a meaningless "Unknown" row) — the
-- logs themselves are unaffected and still count toward the overall
-- public_coffees_logged total and still appear in Recent Coffees.
-- ---------------------------------------------------------------------
create or replace function public.get_public_user_cities(target_username text, result_limit integer default 20)
returns table (
  city text,
  state text,
  coffee_count integer,
  cafe_count integer
)
language sql
security definer
set search_path = public
stable
as $$
  with target as (
    select id from public.profiles where lower(username) = lower(trim(target_username))
  ),
  public_logs as (
    select dl.*
    from public.drink_logs dl
    join target t on dl.user_id = t.id
    where dl.visibility = 'public'
  )
  select
    s.city,
    s.state,
    count(*)::integer as coffee_count,
    count(distinct s.id)::integer as cafe_count
  from public_logs pl
  join public.shops s on s.id = pl.shop_id
  where s.city is not null and length(trim(s.city)) > 0
  group by s.city, s.state
  order by count(*) desc, s.city asc
  limit greatest(1, least(result_limit, 50));
$$;

revoke all on function public.get_public_user_cities(text, integer) from public;
revoke all on function public.get_public_user_cities(text, integer) from anon;
grant execute on function public.get_public_user_cities(text, integer) to authenticated;

-- ---------------------------------------------------------------------
-- get_public_user_drinks: "what does this person publicly drink",
-- grouped by drink name (case-insensitively, since the same drink name
-- can exist as separate rows across different shops), not by broad
-- coffee/tea category. No ratings are invented or averaged here, this
-- is a log count only.
-- ---------------------------------------------------------------------
create or replace function public.get_public_user_drinks(target_username text, result_limit integer default 20)
returns table (
  drink_name text,
  category text,
  log_count integer
)
language sql
security definer
set search_path = public
stable
as $$
  with target as (
    select id from public.profiles where lower(username) = lower(trim(target_username))
  ),
  public_logs as (
    select dl.*
    from public.drink_logs dl
    join target t on dl.user_id = t.id
    where dl.visibility = 'public'
  )
  select
    min(d.name) as drink_name,
    d.category,
    count(*)::integer as log_count
  from public_logs pl
  join public.drinks d on d.id = pl.drink_id
  group by lower(trim(d.name)), d.category
  order by count(*) desc, min(d.name) asc
  limit greatest(1, least(result_limit, 50));
$$;

revoke all on function public.get_public_user_drinks(text, integer) from public;
revoke all on function public.get_public_user_drinks(text, integer) from anon;
grant execute on function public.get_public_user_drinks(text, integer) to authenticated;
