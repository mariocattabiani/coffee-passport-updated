-- Coffee Passport: profile map v2 — city-level aggregation.
--
-- Replaces get_public_user_map's coordinate requirement with a join
-- through shops.location_id -> locations, so a shop with a resolved
-- canonical location contributes a dot even when its own
-- latitude/longitude (which almost no shop has — see location_model.sql)
-- are null. Aggregates at LOCATION (city) level, not per-shop: several
-- cafés in the same city produce ONE dot with a café/drink count, not
-- several overlapping markers, per the "one dot per city" product
-- direction.
--
-- Privacy unchanged: still scoped to `dl.visibility = 'public'` only,
-- exactly like before. A shop with no resolved location_id (city text
-- present but not yet backfilled/matched, or no city at all) simply
-- contributes nothing to the map, same as before — it just no longer
-- ALSO requires exact coordinates on top of that.
--
-- RUN ORDER: after location_model.sql, location_seed.sql, and
-- location_backfill.sql (needs shops.location_id populated to have
-- anything to aggregate).

drop function if exists public.get_public_user_map(text);

create function public.get_public_user_map(target_username text)
returns table (
  location_id uuid,
  city text,
  region text,
  country text,
  latitude numeric,
  longitude numeric,
  cafe_count integer,
  drink_count integer,
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
    l.id as location_id,
    l.city,
    l.region,
    l.country,
    l.latitude,
    l.longitude,
    count(distinct s.id)::integer as cafe_count,
    count(*)::integer as drink_count,
    max(pl.logged_at) as latest_public_visit
  from public_logs pl
  join public.shops s on s.id = pl.shop_id
  join public.locations l on l.id = s.location_id
  group by l.id, l.city, l.region, l.country, l.latitude, l.longitude
  order by count(*) desc, l.city asc;
$$;

revoke all on function public.get_public_user_map(text) from public;
revoke all on function public.get_public_user_map(text) from anon;
grant execute on function public.get_public_user_map(text) to authenticated;

-- ---------------------------------------------------------------------
-- get_public_user_cities, redefined a third time: the previous version
-- unioned resolved and unresolved rows, which correctly stopped
-- deleting real history, but could show the SAME real city twice — one
-- row for a resolved café in Harrisburg, a separate row for an
-- unresolved café also in Harrisburg. This version aggregates BOTH
-- kinds of activity together whenever their DISPLAY identity (city +
-- region + country, normalized the same way) is exactly the same —
-- never a fuzzy guess, only when the text genuinely matches once
-- normalized. A resolved log's location_id always wins for the
-- group (min() picks the one non-null value once grouping is
-- correct); an unresolved log with different display text (e.g. a
-- malformed legacy "Pennsylvania" instead of "PA") is NOT merged —
-- it stays its own separate row, exactly per "if they cannot safely
-- be identified as the same city: keep them separate rather than
-- guessing."
-- ---------------------------------------------------------------------
drop function if exists public.get_public_user_cities(text, integer);

create function public.get_public_user_cities(target_username text, result_limit integer default 20)
returns table (
  location_id uuid,
  city text,
  region text,
  country text,
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
  ),
  -- One row per public log, tagged with a DISPLAY identity: the
  -- resolved canonical location's own city/region/country when the
  -- shop has one, otherwise the shop's own raw persisted text.
  tagged as (
    select
      pl.id as log_id,
      s.id as shop_id,
      s.location_id,
      coalesce(l.city, s.city) as display_city,
      coalesce(l.region, s.state) as display_region,
      coalesce(l.country, s.country) as display_country
    from public_logs pl
    join public.shops s on s.id = pl.shop_id
    left join public.locations l on l.id = s.location_id
    where coalesce(l.city, s.city) is not null
  )
  select
    -- Not min(location_id): location_id is a UUID, and relying on
    -- MIN/MAX ordering over UUIDs is meaningless (UUIDs have no
    -- natural ordering that corresponds to anything semantic) — it
    -- happened to return A value, not necessarily a reliable one. The
    -- actual intent is simpler: "if any row in this group resolved to
    -- a location_id, return one of those non-null values; otherwise
    -- null." array_agg(...) filter (where location_id is not null)[1]
    -- says exactly that — take the first non-null location_id in the
    -- group, order-independent, with no implied UUID comparison at
    -- all. Since grouping is by exact normalized display identity,
    -- a resolved group should normally contain only one distinct
    -- location_id anyway; this just picks it correctly rather than
    -- relying on an aggregate operator that was never meant for UUIDs.
    (array_agg(location_id) filter (where location_id is not null))[1] as location_id,
    -- Prefer the resolved location's own spelling/casing for the
    -- group's display text whenever any log in the group resolved.
    (array_agg(display_city order by (location_id is not null) desc, log_id))[1] as city,
    (array_agg(display_region order by (location_id is not null) desc, log_id))[1] as region,
    (array_agg(display_country order by (location_id is not null) desc, log_id))[1] as country,
    count(*)::integer as coffee_count,
    count(distinct shop_id)::integer as cafe_count
  from tagged
  group by
    lower(trim(display_city)),
    coalesce(upper(trim(display_region)), ''),
    coalesce(lower(trim(display_country)), '')
  order by coffee_count desc, city asc
  limit greatest(1, least(result_limit, 50));
$$;

revoke all on function public.get_public_user_cities(text, integer) from public;
revoke all on function public.get_public_user_cities(text, integer) from anon;
grant execute on function public.get_public_user_cities(text, integer) to authenticated;
