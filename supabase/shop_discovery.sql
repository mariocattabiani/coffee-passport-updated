-- Coffee Passport: Sprint 3G, café discovery.
-- Run once in the SQL Editor. Additive only, does not touch or rerun
-- any earlier migration.

-- No lat/lng index existed before this, every prior sprint's queries
-- were single-shop lookups, this is the first viewport-style scan.
create index if not exists shops_lat_lng_idx on public.shops (latitude, longitude);

-- Correct cost ordering: the bounding box filter runs first, using the
-- index above, against the shops table alone, before drink_logs is
-- ever touched. That bbox-filtered set is then defensively capped at
-- 300, ordered by distance from the bbox center so that if the cap
-- ever binds, it keeps the geographically most-relevant shops rather
-- than an arbitrary slice, before any aggregation, so a very
-- zoomed-out viewport can never cause rating/top-drink/friend
-- aggregation to run against an unbounded number of shops, regardless
-- of how many shops actually fall inside the requested box. The
-- caller-facing result_limit (clamped 1-100, default 50) is applied
-- last, after aggregation and sorting, this is the "narrow candidate
-- set first, aggregate only that set, limit last" ordering, not
-- "aggregate everything, limit afterward".
--
-- Rating and Top Drink reuse the exact same 2+-ratings-for-an-average
-- privacy rule already established in get_shop_rating_summary and
-- get_shop_top_drinks, not a second threshold invented for discovery.
-- Friend context only ever counts a friend's PUBLIC logs, resolved via
-- the same accepted-friendship pattern already used in get_friends_feed.
-- The user's own visited state uses ALL of their own logs, public and
-- private, since that's a personal fact about them, not exposed to
-- anyone else, this matches how Passport itself already treats a
-- user's own history.
create or replace function public.get_shop_discovery_results(
  min_lat numeric,
  max_lat numeric,
  min_lng numeric,
  max_lng numeric,
  result_limit integer default 50
)
returns table (
  shop_id uuid,
  name text,
  city text,
  state text,
  latitude numeric,
  longitude numeric,
  is_chain boolean,
  rating_avg numeric,
  rating_count integer,
  top_drink_name text,
  top_drink_rating numeric,
  visited_by_me boolean,
  my_log_count integer,
  friend_visit_count integer,
  photo_path text
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if min_lat is null or max_lat is null or min_lng is null or max_lng is null then
    raise exception 'Latitude and longitude bounds are required.';
  end if;

  if min_lat < -90 or min_lat > 90 or max_lat < -90 or max_lat > 90 then
    raise exception 'Latitude must be between -90 and 90.';
  end if;

  if min_lng < -180 or min_lng > 180 or max_lng < -180 or max_lng > 180 then
    raise exception 'Longitude must be between -180 and 180.';
  end if;

  -- bounded_candidates aliases public.shops as s and qualifies every
  -- column read below. In plpgsql, RETURNS TABLE output columns
  -- (name, city, state, latitude, longitude, is_chain among them)
  -- become variables in scope for the whole function body, and an
  -- unqualified read of a same-named column is ambiguous, Postgres
  -- can't tell whether "latitude" means the shops.latitude column or
  -- the output variable. Every other CTE and the final select below
  -- already reference columns through an alias (c., r., td., v., fv.,
  -- rp.), this was the only place reading directly off the raw table
  -- with bare names, reviewed the rest of this function to confirm.
  return query
  with bounded_candidates as (
    select s.id, s.name, s.city, s.state, s.latitude, s.longitude, s.is_chain
    from public.shops s
    where s.latitude between least(min_lat, max_lat) and greatest(min_lat, max_lat)
      and s.longitude between least(min_lng, max_lng) and greatest(min_lng, max_lng)
    order by
      abs(s.latitude - (min_lat + max_lat) / 2) + abs(s.longitude - (min_lng + max_lng) / 2) asc
    limit 300
  ),
  my_friends as (
    select case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end as friend_id
    from public.friendships f
    where f.status = 'accepted'
      and (f.requester_id = auth.uid() or f.addressee_id = auth.uid())
  ),
  ratings as (
    select
      c.id as shop_id,
      case when count(dl.id) >= 2 then round(avg(dl.shop_rating), 1) else null end as rating_avg,
      count(dl.id)::integer as rating_count
    from bounded_candidates c
    left join public.drink_logs dl on dl.shop_id = c.id
    group by c.id
  ),
  top_drinks as (
    select c.id as shop_id, td.drink_name as top_drink_name, td.avg_rating as top_drink_rating
    from bounded_candidates c
    left join lateral (
      select
        d.name as drink_name,
        case when count(dl.id) >= 2 then round(avg(dl.drink_rating), 1) else null end as avg_rating
      from public.drink_logs dl
      join public.drinks d on d.id = dl.drink_id
      where dl.shop_id = c.id
      group by d.id, d.name
      order by
        case when count(dl.id) >= 2 then 0 else 1 end asc,
        case when count(dl.id) >= 2 then avg(dl.drink_rating) else null end desc nulls last,
        count(dl.id) desc,
        d.name asc
      limit 1
    ) td on true
  ),
  my_visits as (
    select
      c.id as shop_id,
      (count(dl.id) > 0) as visited_by_me,
      count(dl.id)::integer as my_log_count
    from bounded_candidates c
    left join public.drink_logs dl on dl.shop_id = c.id and dl.user_id = auth.uid()
    group by c.id
  ),
  friend_visits as (
    select
      c.id as shop_id,
      count(distinct dl.user_id)::integer as friend_visit_count
    from bounded_candidates c
    left join public.drink_logs dl
      on dl.shop_id = c.id
      and dl.visibility = 'public'
      and dl.user_id in (select friend_id from my_friends)
    group by c.id
  ),
  representative_photo as (
    -- At most one photo per shop, the most recent public log that has
    -- one, never a carousel, never more than one row per shop here.
    select distinct on (c.id) c.id as shop_id, dl.photo_url as photo_path
    from bounded_candidates c
    join public.drink_logs dl
      on dl.shop_id = c.id
      and dl.visibility = 'public'
      and dl.photo_url is not null
    order by c.id, dl.logged_at desc, dl.created_at desc
  )
  select
    c.id,
    c.name,
    c.city,
    c.state,
    c.latitude,
    c.longitude,
    c.is_chain,
    r.rating_avg,
    coalesce(r.rating_count, 0),
    td.top_drink_name,
    td.top_drink_rating,
    coalesce(v.visited_by_me, false),
    coalesce(v.my_log_count, 0),
    coalesce(fv.friend_visit_count, 0),
    rp.photo_path
  from bounded_candidates c
  left join ratings r on r.shop_id = c.id
  left join top_drinks td on td.shop_id = c.id
  left join my_visits v on v.shop_id = c.id
  left join friend_visits fv on fv.shop_id = c.id
  left join representative_photo rp on rp.shop_id = c.id
  order by
    case when r.rating_avg is not null then r.rating_avg else -1 end desc,
    r.rating_count desc nulls last,
    c.name asc
  limit greatest(1, least(result_limit, 100));
end;
$$;

revoke all on function public.get_shop_discovery_results(numeric, numeric, numeric, numeric, integer) from public;
revoke all on function public.get_shop_discovery_results(numeric, numeric, numeric, numeric, integer) from anon;
grant execute on function public.get_shop_discovery_results(numeric, numeric, numeric, numeric, integer) to authenticated;

-- Same aggregation as above, keyed on an explicit id list instead of a
-- bounding box, used when the person searches by café name (results
-- could be anywhere, not just the current viewport) so search results
-- get the exact same "full Coffee Passport discovery result" treatment
-- as browse results, not a second, thinner data shape. The CTE bodies
-- are intentionally duplicated rather than shared across functions,
-- Postgres has no clean way to share a parameterized CTE fragment
-- across two SECURITY DEFINER functions without more complex plpgsql
-- wrapping that would add more risk than the duplication itself.
create or replace function public.get_shop_discovery_by_ids(shop_ids uuid[])
returns table (
  shop_id uuid,
  name text,
  city text,
  state text,
  latitude numeric,
  longitude numeric,
  is_chain boolean,
  rating_avg numeric,
  rating_count integer,
  top_drink_name text,
  top_drink_rating numeric,
  visited_by_me boolean,
  my_log_count integer,
  friend_visit_count integer,
  photo_path text
)
language sql
security definer
set search_path = public
stable
as $$
  with bounded_candidates as (
    select id, name, city, state, latitude, longitude, is_chain
    from public.shops
    where id = any(shop_ids)
    limit 10
  ),
  my_friends as (
    select case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end as friend_id
    from public.friendships f
    where f.status = 'accepted'
      and (f.requester_id = auth.uid() or f.addressee_id = auth.uid())
  ),
  ratings as (
    select
      c.id as shop_id,
      case when count(dl.id) >= 2 then round(avg(dl.shop_rating), 1) else null end as rating_avg,
      count(dl.id)::integer as rating_count
    from bounded_candidates c
    left join public.drink_logs dl on dl.shop_id = c.id
    group by c.id
  ),
  top_drinks as (
    select c.id as shop_id, td.drink_name as top_drink_name, td.avg_rating as top_drink_rating
    from bounded_candidates c
    left join lateral (
      select
        d.name as drink_name,
        case when count(dl.id) >= 2 then round(avg(dl.drink_rating), 1) else null end as avg_rating
      from public.drink_logs dl
      join public.drinks d on d.id = dl.drink_id
      where dl.shop_id = c.id
      group by d.id, d.name
      order by
        case when count(dl.id) >= 2 then 0 else 1 end asc,
        case when count(dl.id) >= 2 then avg(dl.drink_rating) else null end desc nulls last,
        count(dl.id) desc,
        d.name asc
      limit 1
    ) td on true
  ),
  my_visits as (
    select
      c.id as shop_id,
      (count(dl.id) > 0) as visited_by_me,
      count(dl.id)::integer as my_log_count
    from bounded_candidates c
    left join public.drink_logs dl on dl.shop_id = c.id and dl.user_id = auth.uid()
    group by c.id
  ),
  friend_visits as (
    select
      c.id as shop_id,
      count(distinct dl.user_id)::integer as friend_visit_count
    from bounded_candidates c
    left join public.drink_logs dl
      on dl.shop_id = c.id
      and dl.visibility = 'public'
      and dl.user_id in (select friend_id from my_friends)
    group by c.id
  ),
  representative_photo as (
    select distinct on (c.id) c.id as shop_id, dl.photo_url as photo_path
    from bounded_candidates c
    join public.drink_logs dl
      on dl.shop_id = c.id
      and dl.visibility = 'public'
      and dl.photo_url is not null
    order by c.id, dl.logged_at desc, dl.created_at desc
  )
  select
    c.id,
    c.name,
    c.city,
    c.state,
    c.latitude,
    c.longitude,
    c.is_chain,
    r.rating_avg,
    coalesce(r.rating_count, 0),
    td.top_drink_name,
    td.top_drink_rating,
    coalesce(v.visited_by_me, false),
    coalesce(v.my_log_count, 0),
    coalesce(fv.friend_visit_count, 0),
    rp.photo_path
  from bounded_candidates c
  left join ratings r on r.shop_id = c.id
  left join top_drinks td on td.shop_id = c.id
  left join my_visits v on v.shop_id = c.id
  left join friend_visits fv on fv.shop_id = c.id
  left join representative_photo rp on rp.shop_id = c.id;
$$;

revoke all on function public.get_shop_discovery_by_ids(uuid[]) from public;
revoke all on function public.get_shop_discovery_by_ids(uuid[]) from anon;
grant execute on function public.get_shop_discovery_by_ids(uuid[]) to authenticated;
