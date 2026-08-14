-- Coffee Passport: Sprint 3F, people search and public profiles.
-- Run once in the SQL Editor, after friendships.sql and
-- friendship_rpcs.sql. Additive only.
--
-- profiles SELECT RLS stays owner-only throughout, every field
-- returned here is explicitly selected, never a raw row. Public
-- coffee stats and activity are computed only from visibility =
-- 'public' logs, a private log never contributes to any of it, and
-- filtering happens entirely inside Postgres, never fetched broadly
-- and reduced in application code.

-- Prefix search only for this MVP, case-insensitive, on username and
-- first_name. A 2-character minimum is enforced here, not just on the
-- client, so a short/empty query can never trigger a broad scan
-- through this function directly. friendship_state is resolved inline
-- per row via one join, not a separate call per result.
create or replace function public.search_users(query text, result_limit integer default 20)
returns table (
  user_id uuid,
  username text,
  first_name text,
  avatar_url text,
  friendship_state text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id as user_id,
    p.username,
    p.first_name,
    p.avatar_url,
    case
      when f.status = 'accepted' then 'friends'
      when f.requester_id = auth.uid() then 'outgoing_pending'
      when f.id is not null then 'incoming_pending'
      else 'none'
    end as friendship_state
  from public.profiles p
  left join public.friendships f
    on f.user_low = least(p.id, auth.uid())
   and f.user_high = greatest(p.id, auth.uid())
  where auth.uid() is not null
    and p.id <> auth.uid()
    and p.username is not null
    and length(trim(query)) >= 2
    and (
      p.username ilike trim(query) || '%'
      or p.first_name ilike trim(query) || '%'
    )
  order by p.username asc
  limit greatest(1, least(result_limit, 50));
$$;

revoke all on function public.search_users(text, integer) from public;
revoke all on function public.search_users(text, integer) from anon;
grant execute on function public.search_users(text, integer) to authenticated;

-- Identity plus public-only aggregates for one user's social profile.
-- Favorite drink/café use the same tie-break convention already
-- established on Passport and shop pages: count desc, avg desc, name
-- asc, computed only from that person's own public logs.
create or replace function public.get_public_user_profile(target_username text)
returns table (
  user_id uuid,
  username text,
  first_name text,
  avatar_url text,
  friendship_state text,
  public_coffees_logged integer,
  public_cafes_visited integer,
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

-- Same 3-key cursor convention as get_public_feed, scoped to one
-- user's public logs only.
create or replace function public.get_public_user_activity(
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
  shop_name text
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
    s.name as shop_name
  from public.drink_logs dl
  join public.profiles p on p.id = dl.user_id
  join public.drinks d on d.id = dl.drink_id
  join public.shops s on s.id = dl.shop_id
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

-- Same shape as get_public_feed, filtered to accepted friends only.
-- Friendship never bypasses the visibility filter, a friend's private
-- log is excluded exactly the same as a stranger's.
create or replace function public.get_friends_feed(
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
    p.username,
    p.first_name,
    p.avatar_url
  from public.drink_logs dl
  join my_friends mf on mf.friend_id = dl.user_id
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

revoke all on function public.get_friends_feed(timestamptz, timestamptz, uuid, integer) from public;
revoke all on function public.get_friends_feed(timestamptz, timestamptz, uuid, integer) from anon;
grant execute on function public.get_friends_feed(timestamptz, timestamptz, uuid, integer) to authenticated;
