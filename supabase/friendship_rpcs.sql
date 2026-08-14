-- Coffee Passport: Sprint 3F, friendship state-change RPCs.
-- Run once in the SQL Editor, after friendships.sql. Additive only.
--
-- friendships has no insert/update/delete policy at all, every write
-- goes through one of these functions. Each returns a structured
-- (success, message) result rather than raising a raw exception, so
-- the app never needs to parse Postgres error text, it just checks
-- success and shows message (or a friendlier client-side string).
-- Race safety comes from the unique (user_low, user_high) constraint
-- itself, not from any pre-check here, send_friend_request attempts
-- the insert and catches a genuine constraint violation rather than
-- trusting a select-then-insert timing window.

create or replace function public.send_friend_request(target_user_id uuid)
returns table (success boolean, message text)
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    return query select false, 'You must be signed in.';
    return;
  end if;
  if me = target_user_id then
    return query select false, 'You cannot send yourself a friend request.';
    return;
  end if;

  begin
    insert into public.friendships (requester_id, addressee_id, status)
    values (me, target_user_id, 'pending');
  exception
    when unique_violation then
      return query select false, 'A request or friendship already exists.';
      return;
    when foreign_key_violation then
      return query select false, 'That user could not be found.';
      return;
  end;

  return query select true, 'Friend request sent.';
end;
$$;

revoke all on function public.send_friend_request(uuid) from public;
revoke all on function public.send_friend_request(uuid) from anon;
grant execute on function public.send_friend_request(uuid) to authenticated;

create or replace function public.accept_friend_request(target_user_id uuid)
returns table (success boolean, message text)
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  updated_count integer;
begin
  if me is null then
    return query select false, 'You must be signed in.';
    return;
  end if;

  update public.friendships
  set status = 'accepted', updated_at = now()
  where user_low = least(me, target_user_id)
    and user_high = greatest(me, target_user_id)
    and addressee_id = me
    and status = 'pending';

  get diagnostics updated_count = row_count;

  if updated_count = 0 then
    return query select false, 'That request could not be found or has already changed.';
    return;
  end if;

  return query select true, 'Friend request accepted.';
end;
$$;

revoke all on function public.accept_friend_request(uuid) from public;
revoke all on function public.accept_friend_request(uuid) from anon;
grant execute on function public.accept_friend_request(uuid) to authenticated;

create or replace function public.decline_friend_request(target_user_id uuid)
returns table (success boolean, message text)
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  deleted_count integer;
begin
  if me is null then
    return query select false, 'You must be signed in.';
    return;
  end if;

  delete from public.friendships
  where user_low = least(me, target_user_id)
    and user_high = greatest(me, target_user_id)
    and addressee_id = me
    and status = 'pending';

  get diagnostics deleted_count = row_count;

  if deleted_count = 0 then
    return query select false, 'That request could not be found.';
    return;
  end if;

  return query select true, 'Request declined.';
end;
$$;

revoke all on function public.decline_friend_request(uuid) from public;
revoke all on function public.decline_friend_request(uuid) from anon;
grant execute on function public.decline_friend_request(uuid) to authenticated;

create or replace function public.cancel_friend_request(target_user_id uuid)
returns table (success boolean, message text)
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  deleted_count integer;
begin
  if me is null then
    return query select false, 'You must be signed in.';
    return;
  end if;

  delete from public.friendships
  where user_low = least(me, target_user_id)
    and user_high = greatest(me, target_user_id)
    and requester_id = me
    and status = 'pending';

  get diagnostics deleted_count = row_count;

  if deleted_count = 0 then
    return query select false, 'That request could not be found.';
    return;
  end if;

  return query select true, 'Request canceled.';
end;
$$;

revoke all on function public.cancel_friend_request(uuid) from public;
revoke all on function public.cancel_friend_request(uuid) from anon;
grant execute on function public.cancel_friend_request(uuid) to authenticated;

create or replace function public.remove_friend(target_user_id uuid)
returns table (success boolean, message text)
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  deleted_count integer;
begin
  if me is null then
    return query select false, 'You must be signed in.';
    return;
  end if;

  delete from public.friendships
  where user_low = least(me, target_user_id)
    and user_high = greatest(me, target_user_id)
    and status = 'accepted';

  get diagnostics deleted_count = row_count;

  if deleted_count = 0 then
    return query select false, 'That friendship could not be found.';
    return;
  end if;

  return query select true, 'Friend removed.';
end;
$$;

revoke all on function public.remove_friend(uuid) from public;
revoke all on function public.remove_friend(uuid) from anon;
grant execute on function public.remove_friend(uuid) to authenticated;

-- One relationship, resolved server-side, for a single profile/card.
create or replace function public.get_friendship_state(target_user_id uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select case
    when auth.uid() is null then 'none'
    when auth.uid() = target_user_id then 'self'
    else coalesce((
      select case
        when f.status = 'accepted' then 'friends'
        when f.requester_id = auth.uid() then 'outgoing_pending'
        else 'incoming_pending'
      end
      from public.friendships f
      where f.user_low = least(auth.uid(), target_user_id)
        and f.user_high = greatest(auth.uid(), target_user_id)
    ), 'none')
  end;
$$;

revoke all on function public.get_friendship_state(uuid) from public;
revoke all on function public.get_friendship_state(uuid) from anon;
grant execute on function public.get_friendship_state(uuid) to authenticated;

-- For the small nav badge, one cheap count, nothing else.
create or replace function public.get_pending_request_count()
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::integer
  from public.friendships
  where addressee_id = auth.uid()
  and status = 'pending';
$$;

revoke all on function public.get_pending_request_count() from public;
revoke all on function public.get_pending_request_count() from anon;
grant execute on function public.get_pending_request_count() to authenticated;

-- Added during implementation, not in the original architecture plan:
-- the /friends page needs to show the *other* person's name and avatar
-- for the caller's own requests and friends, and profiles SELECT RLS
-- is owner-only, so a plain client-side join from friendships (which
-- the caller CAN read directly) to profiles (which they can't, for
-- anyone but themselves) isn't possible without one of these. Same
-- hardening pattern as everything else in this file.

create or replace function public.get_my_friends()
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
  select p.id, p.username, p.first_name, p.avatar_url
  from public.friendships f
  join public.profiles p
    on p.id = case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end
  where f.status = 'accepted'
    and (f.requester_id = auth.uid() or f.addressee_id = auth.uid())
  order by p.username asc;
$$;

revoke all on function public.get_my_friends() from public;
revoke all on function public.get_my_friends() from anon;
grant execute on function public.get_my_friends() to authenticated;

create or replace function public.get_my_incoming_requests()
returns table (
  user_id uuid,
  username text,
  first_name text,
  avatar_url text,
  requested_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.username, p.first_name, p.avatar_url, f.created_at
  from public.friendships f
  join public.profiles p on p.id = f.requester_id
  where f.addressee_id = auth.uid()
    and f.status = 'pending'
  order by f.created_at desc;
$$;

revoke all on function public.get_my_incoming_requests() from public;
revoke all on function public.get_my_incoming_requests() from anon;
grant execute on function public.get_my_incoming_requests() to authenticated;
