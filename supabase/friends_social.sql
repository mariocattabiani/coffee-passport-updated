-- Coffee Passport: Friends + Mutual Friends sprint.
-- Run once in the SQL Editor, after friendships.sql, friendship_rpcs.sql,
-- and public_profile_v2.sql. Additive and rerun-safe: every function
-- below is either new or a CREATE OR REPLACE / DROP + CREATE pair, no
-- destructive statements, no existing friendship data or semantics are
-- altered, and public.friendships keeps its existing RLS untouched
-- (still no insert/update/delete policy — every write still goes
-- through the RPCs in friendship_rpcs.sql; everything here is
-- read-only).
--
-- All three new functions below share the exact same "accepted
-- friends of X" shape already used by get_my_friends() and the
-- get_friends_leaderboard()/get_friends_feed() queries that
-- performance_indexes.sql added indexes for:
--
--   select case when f.requester_id = X then f.addressee_id else f.requester_id end as friend_id
--   from public.friendships f
--   where f.status = 'accepted' and (f.requester_id = X or f.addressee_id = X)
--
-- That shape is already served by the friendships_requester_accepted_idx
-- and friendships_addressee_accepted_idx partial indexes, so none of
-- this needs a new index.

-- ---------------------------------------------------------------------
-- get_friend_count: total accepted friends for ANY user (not just the
-- caller), so it can back both the owner's own Passport stat and a
-- public profile's "X friends" line from a single cheap function. No
-- privacy check beyond "must be signed in" — this mirrors the existing
-- public-profile model, where public_coffees_logged/public_cafes_visited
-- are already shown for any target user to any authenticated viewer.
-- Never counts pending requests, never double-counts (the
-- friendships_unique_pair constraint guarantees at most one row per
-- pair), and never counts the target user themselves (friendships_no_self
-- makes a self-row impossible).
-- ---------------------------------------------------------------------
create or replace function public.get_friend_count(target_user_id uuid)
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select case
    when auth.uid() is null then 0
    else (
      select count(*)::integer
      from public.friendships f
      where f.status = 'accepted'
        and (f.requester_id = target_user_id or f.addressee_id = target_user_id)
    )
  end;
$$;

revoke all on function public.get_friend_count(uuid) from public;
revoke all on function public.get_friend_count(uuid) from anon;
grant execute on function public.get_friend_count(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- get_mutual_friend_count: friends the CALLER and target_user_id share,
-- i.e. |friends(auth.uid()) intersect friends(target_user_id)|. Returns
-- 0 (not an error) when signed out or when target_user_id is the caller
-- themselves, since "mutual friends with yourself" isn't a real concept
-- and the caller should simply not render that line for isSelf profiles.
-- Both a_friends and b_friends already exclude their own owner by
-- construction (friendships_no_self), so the intersection can never
-- include the caller or the target.
-- ---------------------------------------------------------------------
create or replace function public.get_mutual_friend_count(target_user_id uuid)
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select case
    when auth.uid() is null or auth.uid() = target_user_id then 0
    else (
      with a_friends as (
        select case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end as friend_id
        from public.friendships f
        where f.status = 'accepted'
          and (f.requester_id = auth.uid() or f.addressee_id = auth.uid())
      ),
      b_friends as (
        select case when f.requester_id = target_user_id then f.addressee_id else f.requester_id end as friend_id
        from public.friendships f
        where f.status = 'accepted'
          and (f.requester_id = target_user_id or f.addressee_id = target_user_id)
      )
      select count(*)::integer
      from a_friends
      where friend_id in (select friend_id from b_friends)
    )
  end;
$$;

revoke all on function public.get_mutual_friend_count(uuid) from public;
revoke all on function public.get_mutual_friend_count(uuid) from anon;
grant execute on function public.get_mutual_friend_count(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- get_friend_list: the one query the friend-list sheet needs, for
-- EITHER the caller's own list (target_user_id = auth.uid(), from
-- Passport) or someone else's list (from a public profile). Single
-- round trip, joined profile data, no N+1: one scan of target's
-- friends, one join out to their friends-of-friends to compute mutual
-- counts against the caller in bulk, one join to profiles, one join
-- back to friendships for the caller-relative friendship_state. Never
-- loops per-row in application code.
--
-- mutual_count for a given row is |friends(that person) intersect
-- friends(auth.uid())| — defined the same way whether target_user_id
-- is the caller's own id or someone else's. This is a "shared
-- connections" count (how many friends the viewer and that row-person
-- have in common through third parties), NOT the definition of
-- is_mutual below — those are two different concepts and must not be
-- conflated.
--
-- is_mutual answers a narrower question: is this row-person a mutual
-- friend BETWEEN THE VIEWER AND THE PROFILE OWNER, i.e. is the viewer
-- ALSO directly friends with them (they're already known to be
-- friends with target_user_id, by construction of target_friends).
-- That's exactly what fs (the friendships row between p.id and
-- auth.uid(), already joined below for friendship_state) tells us:
-- fs.status = 'accepted' means the viewer and this row-person are
-- direct friends. Using mutual_count > 0 here was wrong — it marked a
-- row "mutual" merely because the viewer and that person happened to
-- share some unrelated third friend, even if the viewer had never
-- friended that person directly. A person can never be mutual with
-- themselves: if the row IS the caller (the caller appears in someone
-- else's friend list), fs is the caller's own self-pair and never has
-- status 'accepted' (friendships_no_self), so is_mutual is false there
-- too, consistent with friendship_state resolving to 'self' for that
-- row.
--
-- Ordering: true mutual friends first (Part E), then by shared-
-- connections count, then alphabetically, so the most relevant people
-- surface first without any separate ranking system. For the owner's
-- own friend list every row is trivially "mutual" by this definition
-- (every friend of target_user_id IS a friend of auth.uid() when
-- they're the same person), so the frontend suppresses the mutual
-- treatment entirely there via the isOwnList prop rather than the SQL
-- trying to special-case it.
-- ---------------------------------------------------------------------
create or replace function public.get_friend_list(target_user_id uuid, result_limit integer default 300)
returns table (
  user_id uuid,
  username text,
  first_name text,
  avatar_url text,
  city text,
  friendship_state text,
  is_mutual boolean,
  mutual_count integer
)
language sql
security definer
set search_path = public
stable
as $$
  with target_friends as (
    select case when f.requester_id = target_user_id then f.addressee_id else f.requester_id end as friend_id
    from public.friendships f
    where f.status = 'accepted'
      and (f.requester_id = target_user_id or f.addressee_id = target_user_id)
  ),
  caller_friends as (
    select case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end as friend_id
    from public.friendships f
    where auth.uid() is not null
      and f.status = 'accepted'
      and (f.requester_id = auth.uid() or f.addressee_id = auth.uid())
  ),
  candidate_friends_of_friends as (
    -- one row per (target's friend, that friend's own friend) so each
    -- of target's friends' full friend-of-friend sets can be compared
    -- against caller_friends in one join below, instead of one
    -- correlated subquery per row.
    select
      tf.friend_id as candidate_id,
      case when f.requester_id = tf.friend_id then f.addressee_id else f.requester_id end as their_friend_id
    from target_friends tf
    join public.friendships f
      on f.status = 'accepted'
     and (f.requester_id = tf.friend_id or f.addressee_id = tf.friend_id)
  ),
  mutuals as (
    select cff.candidate_id, count(*)::integer as mutual_count
    from candidate_friends_of_friends cff
    join caller_friends cf on cf.friend_id = cff.their_friend_id
    group by cff.candidate_id
  )
  select
    p.id as user_id,
    p.username,
    p.first_name,
    p.avatar_url,
    p.city,
    case
      when auth.uid() is null then 'none'
      when p.id = auth.uid() then 'self'
      when fs.status = 'accepted' then 'friends'
      when fs.requester_id = auth.uid() then 'outgoing_pending'
      when fs.id is not null then 'incoming_pending'
      else 'none'
    end as friendship_state,
    coalesce(fs.status = 'accepted', false) as is_mutual,
    coalesce(m.mutual_count, 0) as mutual_count
  from target_friends tf
  join public.profiles p on p.id = tf.friend_id
  left join mutuals m on m.candidate_id = tf.friend_id
  left join public.friendships fs
    on auth.uid() is not null
   and fs.user_low = least(p.id, auth.uid())
   and fs.user_high = greatest(p.id, auth.uid())
  order by coalesce(fs.status = 'accepted', false) desc, coalesce(m.mutual_count, 0) desc, p.username asc
  limit greatest(1, least(result_limit, 300));
$$;

revoke all on function public.get_friend_list(uuid, integer) from public;
revoke all on function public.get_friend_list(uuid, integer) from anon;
grant execute on function public.get_friend_list(uuid, integer) to authenticated;

-- ---------------------------------------------------------------------
-- get_public_user_profile: extended (DROP + CREATE, same reason as
-- public_profile_v2.sql — adding columns changes the RETURNS TABLE
-- shape, which CREATE OR REPLACE cannot do) with friend_count and
-- mutual_friend_count, so the public-profile page can show "X friends"
-- and "Y mutual friends" from the same single round trip as everything
-- else on that page, with no extra request on initial load. Every
-- other column and the join/CTE structure is unchanged from
-- public_profile_v2.sql. mutual_friend_count is 0 for isSelf (viewing
-- your own username), matching get_mutual_friend_count's own self rule
-- so the frontend can just check friendship_state === 'self' and hide
-- the line rather than checking two different things.
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
  favorite_shop_name text,
  friend_count integer,
  mutual_friend_count integer
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
    (select name from shop_fav),
    public.get_friend_count(p.id),
    public.get_mutual_friend_count(p.id)
  from public.profiles p
  join target t on t.id = p.id
  left join public.friendships f
    on f.user_low = least(p.id, auth.uid())
   and f.user_high = greatest(p.id, auth.uid());
$$;

revoke all on function public.get_public_user_profile(text) from public;
revoke all on function public.get_public_user_profile(text) from anon;
grant execute on function public.get_public_user_profile(text) to authenticated;
