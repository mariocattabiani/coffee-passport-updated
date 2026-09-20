-- Coffee Passport: Café Page V2 sprint, "Friends who have been here".
-- Run once in the SQL Editor, after friendships.sql and
-- friendship_rpcs.sql. Additive only: two new read-only functions, no
-- existing table, RLS, or function is touched.
--
-- Mirrors get_friend_count / get_friend_list's split into a cheap
-- count function plus a small list function, and reuses the exact
-- "accepted friends of the caller" shape already established in
-- friends_social.sql.
--
-- PRIVACY: friendship never bypasses a log's own visibility, exactly
-- the rule get_friends_feed already established (see the comment
-- above that function in public_profiles.sql) — a friend's PRIVATE
-- log at this café is never counted or revealed here, even though the
-- caller and that friend are connected. Only visibility = 'public'
-- logs make a friend "have been here" from the caller's point of view.

create or replace function public.get_shop_friends_here_count(target_shop_id uuid)
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select case
    when auth.uid() is null then 0
    else (
      with caller_friends as (
        select case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end as friend_id
        from public.friendships f
        where f.status = 'accepted'
          and (f.requester_id = auth.uid() or f.addressee_id = auth.uid())
      )
      select count(distinct cf.friend_id)::integer
      from caller_friends cf
      join public.drink_logs dl
        on dl.user_id = cf.friend_id
       and dl.shop_id = target_shop_id
       and dl.visibility = 'public'
    )
  end;
$$;

revoke all on function public.get_shop_friends_here_count(uuid) from public;
revoke all on function public.get_shop_friends_here_count(uuid) from anon;
grant execute on function public.get_shop_friends_here_count(uuid) to authenticated;

-- A small preview list (avatar row), not the full count — result_limit
-- caps it well below the count so the UI can show "Allie, Mike +3 have
-- been here" using count() for the "+3" without fetching every row.
create or replace function public.get_shop_friends_here(target_shop_id uuid, result_limit integer default 6)
returns table (
  user_id uuid,
  username text,
  first_name text,
  avatar_url text
)
language sql
security definer
set search_path = public
stable
as $$
  with caller_friends as (
    select case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end as friend_id
    from public.friendships f
    where auth.uid() is not null
      and f.status = 'accepted'
      and (f.requester_id = auth.uid() or f.addressee_id = auth.uid())
  ),
  friends_here as (
    select distinct cf.friend_id
    from caller_friends cf
    join public.drink_logs dl
      on dl.user_id = cf.friend_id
     and dl.shop_id = target_shop_id
     and dl.visibility = 'public'
  )
  select p.id, p.username, p.first_name, p.avatar_url
  from friends_here fh
  join public.profiles p on p.id = fh.friend_id
  order by p.username asc
  limit greatest(1, least(result_limit, 20));
$$;

revoke all on function public.get_shop_friends_here(uuid, integer) from public;
revoke all on function public.get_shop_friends_here(uuid, integer) from anon;
grant execute on function public.get_shop_friends_here(uuid, integer) to authenticated;
