-- Coffee Passport: Leaderboard (drinks-logged, all time, V1).
--
-- Additive and re-runnable. No destructive changes, no backfill.
-- Counts every one of a user's own drink_logs rows regardless of
-- visibility (public/private) — the leaderboard measures app
-- activity, not how much someone chooses to share publicly, matching
-- the explicit product decision this was built against. Only the
-- aggregate COUNT is ever exposed; no individual log's content, café,
-- caption, or visibility is returned by any function here.
--
-- Friends scope derives auth.uid() itself, exactly like every other
-- SECURITY DEFINER function in this project — no viewer_user_id
-- parameter exists to accept from the client, so it can never be
-- asked to compute someone else's friends list.

create index if not exists drink_logs_user_id_idx on public.drink_logs (user_id);

-- ---------------------------------------------------------------------
-- get_global_leaderboard: every user with at least one drink log,
-- ranked by total count. Users with zero logs are intentionally
-- excluded here (an inner join, not left) — at global scale, showing
-- every registered-but-inactive account would bury the actual
-- ranking in noise. is_current_user lets the page subtly highlight
-- the caller's own row without a second query/lookup.
-- ---------------------------------------------------------------------
create or replace function public.get_global_leaderboard(result_limit integer default 100)
returns table (
  user_id uuid,
  username text,
  first_name text,
  avatar_url text,
  drink_count integer,
  rank integer,
  is_current_user boolean
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
    count(dl.id)::integer as drink_count,
    rank() over (order by count(dl.id) desc)::integer as rank,
    (p.id = auth.uid()) as is_current_user
  from public.profiles p
  join public.drink_logs dl on dl.user_id = p.id
  group by p.id, p.username, p.first_name, p.avatar_url
  order by drink_count desc, p.username asc
  limit greatest(1, least(result_limit, 200));
$$;

revoke all on function public.get_global_leaderboard(integer) from public;
revoke all on function public.get_global_leaderboard(integer) from anon;
grant execute on function public.get_global_leaderboard(integer) to authenticated;

-- ---------------------------------------------------------------------
-- get_friends_leaderboard: the caller's accepted friends, PLUS the
-- caller themselves (so they can see their own standing among
-- friends, per product direction) — a left join here, deliberately
-- different from the global function's inner join: a friend with zero
-- logs is still meaningful to show in a small, curated friends list,
-- the way it wouldn't be at global scale.
-- ---------------------------------------------------------------------
create or replace function public.get_friends_leaderboard(result_limit integer default 100)
returns table (
  user_id uuid,
  username text,
  first_name text,
  avatar_url text,
  drink_count integer,
  rank integer,
  is_current_user boolean
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
  ),
  scope as (
    select friend_id as user_id from my_friends
    union
    select auth.uid() as user_id
  )
  select
    p.id as user_id,
    p.username,
    p.first_name,
    p.avatar_url,
    count(dl.id)::integer as drink_count,
    rank() over (order by count(dl.id) desc)::integer as rank,
    (p.id = auth.uid()) as is_current_user
  from scope s
  join public.profiles p on p.id = s.user_id
  left join public.drink_logs dl on dl.user_id = p.id
  group by p.id, p.username, p.first_name, p.avatar_url
  order by drink_count desc, p.username asc
  limit greatest(1, least(result_limit, 200));
$$;

revoke all on function public.get_friends_leaderboard(integer) from public;
revoke all on function public.get_friends_leaderboard(integer) from anon;
grant execute on function public.get_friends_leaderboard(integer) to authenticated;

-- ---------------------------------------------------------------------
-- get_my_global_rank: the caller's own global rank/count even when
-- they're outside the visible top-100 — computed from the same
-- ranking as get_global_leaderboard (an inner join, so a caller with
-- zero logs gets no row back, same "not ranked yet" case the global
-- board itself would show as absent).
-- ---------------------------------------------------------------------
create or replace function public.get_my_global_rank()
returns table (drink_count integer, rank integer)
language sql
security definer
set search_path = public
stable
as $$
  with ranked as (
    select
      dl.user_id,
      count(dl.id)::integer as drink_count,
      rank() over (order by count(dl.id) desc)::integer as rank
    from public.drink_logs dl
    group by dl.user_id
  )
  select drink_count, rank from ranked where user_id = auth.uid();
$$;

revoke all on function public.get_my_global_rank() from public;
revoke all on function public.get_my_global_rank() from anon;
grant execute on function public.get_my_global_rank() to authenticated;
