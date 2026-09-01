-- Coffee Passport: Comments/Notifications sprint — unified activity
-- system.
--
-- RUN ORDER: run log_comments.sql FIRST (this file's notifications
-- table has a foreign key to public.log_comments(id), and this file's
-- create_comment, appended at the end, needs that table to already
-- exist too). Run this file second. social_feed_v3.sql runs last.
--
-- Additive only. Redefines toggle_like (from log_likes.sql) to also
-- create a notification on a fresh like — this is the one function
-- from an earlier sprint this file changes, and it's a pure addition
-- to its behavior (still returns the exact same (liked, like_count)
-- shape), never a change to what it already did.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references public.profiles(id) on delete cascade,
  actor_user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('like', 'comment')),
  drink_log_id uuid references public.drink_logs(id) on delete cascade,
  comment_id uuid references public.log_comments(id) on delete cascade,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

alter table public.notifications enable row level security;

drop policy if exists "Users can view their own notifications" on public.notifications;
create policy "Users can view their own notifications"
  on public.notifications for select
  to authenticated
  using (auth.uid() = recipient_user_id);

-- The one direct-mutation exception in this whole social system: a
-- recipient marking their own notification read is a trivial,
-- narrowly-scoped update (only read_at, only their own rows), safe to
-- allow directly rather than routing through a function — unlike
-- likes/saves/comments, there's no eligibility rule to enforce here
-- beyond ownership, which RLS already expresses completely on its own.
-- No direct UPDATE policy for the client, and none should be added.
-- This DROP (with no matching CREATE) is what removes the policy for
-- anyone who already ran an earlier version of this file that created
-- one — re-running this file is what corrects that installation, not
-- just what a fresh install gets right the first time.
drop policy if exists "Users can mark their own notifications read" on public.notifications;
--
-- RLS controls which ROWS a policy applies to, not which COLUMNS a
-- permitted UPDATE may touch — a "recipient can update their own rows"
-- policy would let a client-issued update touch actor_user_id, type,
-- or drink_log_id on their own notifications just as easily as
-- read_at, since Postgres RLS has no per-column granularity. Read
-- state is mutated exclusively through mark_notification_read and
-- mark_all_notifications_read below, both SECURITY DEFINER, both
-- touching read_at only, by construction of the function body, not by
-- an RLS policy trusting the client's own UPDATE statement to behave.
--
-- Explicit revokes, not just "no policy": Supabase's default schema
-- privileges typically grant UPDATE (among others) on public tables to
-- `authenticated` at the table level, with RLS then deciding which
-- rows/commands actually succeed. With no UPDATE policy at all, RLS
-- already denies every direct update — these revokes are defense in
-- depth on top of that, removing the table-level privilege itself
-- rather than relying solely on the absence of a permissive policy.
-- SECURITY DEFINER functions are unaffected: they execute as the
-- function owner, not as `authenticated`, so mark_notification_read/
-- mark_all_notifications_read keep working exactly as before.
revoke insert, update, delete on public.notifications from authenticated;
revoke insert, update, delete on public.notifications from anon;

-- No INSERT/DELETE policy for the client at all: notifications are
-- only ever created by create_notification_internal (called from
-- inside toggle_like/create_comment, never directly by the client,
-- see the explicit revoke below), and only ever removed via cascade
-- (log/comment deletion), never a direct client delete.

create index if not exists notifications_recipient_idx on public.notifications (recipient_user_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications (recipient_user_id) where read_at is null;

-- One notification per (recipient, actor, log) for LIKE specifically —
-- a like/unlike/like cycle reuses the same row (refreshing created_at
-- and read_at) rather than spamming a new row every cycle. COMMENT has
-- no such uniqueness: every genuinely new comment is its own event and
-- deserves its own notification.
create unique index if not exists notifications_like_dedup_key
  on public.notifications (recipient_user_id, actor_user_id, drink_log_id, type)
  where type = 'like';

-- ---------------------------------------------------------------------
-- create_notification_internal: deliberately NOT granted to
-- `authenticated`. This only ever runs from inside another SECURITY
-- DEFINER function's body (toggle_like, create_comment), which
-- executes as those functions' owner regardless of the original
-- caller's role, so the nested call succeeds without needing a grant
-- to `authenticated`. A client that COULD call this directly would be
-- able to forge a notification claiming any actor liked/commented on
-- any recipient's log — exactly the forgery toggle_like/create_comment
-- prevent by deriving auth.uid() themselves before ever reaching this
-- function. Never call this with anything other than auth.uid() as
-- the actor.
-- ---------------------------------------------------------------------
create or replace function public.create_notification_internal(
  p_recipient_user_id uuid,
  p_actor_user_id uuid,
  p_type text,
  p_drink_log_id uuid default null,
  p_comment_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- No self-notifications, ever.
  if p_recipient_user_id = p_actor_user_id then
    return;
  end if;

  if p_type = 'like' then
    insert into public.notifications (recipient_user_id, actor_user_id, type, drink_log_id, comment_id, created_at, read_at)
    values (p_recipient_user_id, p_actor_user_id, 'like', p_drink_log_id, null, now(), null)
    on conflict (recipient_user_id, actor_user_id, drink_log_id, type)
      where type = 'like'
    do update set created_at = excluded.created_at, read_at = null;
  else
    insert into public.notifications (recipient_user_id, actor_user_id, type, drink_log_id, comment_id)
    values (p_recipient_user_id, p_actor_user_id, p_type, p_drink_log_id, p_comment_id);
  end if;
end;
$$;

revoke all on function public.create_notification_internal(uuid, uuid, text, uuid, uuid) from public;
revoke all on function public.create_notification_internal(uuid, uuid, text, uuid, uuid) from anon;
revoke all on function public.create_notification_internal(uuid, uuid, text, uuid, uuid) from authenticated;

-- ---------------------------------------------------------------------
-- get_my_notifications: the Activity feed. target_available mirrors
-- the exact pattern already established for saves' source_visible
-- (see saved_view.sql) — true only when the underlying log is still
-- public right now. When false, drink_log_id, drink_name, and
-- comment_body are ALL nulled out here, in SQL, not left for the UI to
-- remember to hide. drink_log_id specifically must never be returned
-- for an unavailable target: it's a usable identifier a client could
-- otherwise pass straight to /logs/[id] or get_public_log, and that
-- route/RPC's own privacy guarantees only hold for a log that's
-- actually still public — this function shouldn't hand out an ID for
-- one that isn't. A log that's gone private or been deleted looks
-- identical from this function's output either way, no distinguishing
-- signal is ever exposed.
-- ---------------------------------------------------------------------
create or replace function public.get_my_notifications(before_created_at timestamptz default null, page_size integer default 50)
returns table (
  notification_id uuid,
  type text,
  actor_user_id uuid,
  actor_first_name text,
  actor_username text,
  actor_avatar_url text,
  drink_log_id uuid,
  drink_name text,
  target_available boolean,
  comment_body text,
  created_at timestamptz,
  read_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  with base as (
    select
      n.*,
      coalesce(n.drink_log_id is not null and public.is_public_drink_log(n.drink_log_id), false) as is_available
    from public.notifications n
    where n.recipient_user_id = auth.uid()
      and (before_created_at is null or n.created_at < before_created_at)
  )
  select
    b.id as notification_id,
    b.type,
    b.actor_user_id,
    p.first_name as actor_first_name,
    p.username as actor_username,
    p.avatar_url as actor_avatar_url,
    case when b.is_available then b.drink_log_id else null end as drink_log_id,
    case when b.is_available then d.name else null end as drink_name,
    b.is_available as target_available,
    case when b.is_available then lc.body else null end as comment_body,
    b.created_at,
    b.read_at
  from base b
  join public.profiles p on p.id = b.actor_user_id
  left join public.drink_logs dl on dl.id = b.drink_log_id
  left join public.drinks d on d.id = dl.drink_id
  left join public.log_comments lc on lc.id = b.comment_id
  order by b.created_at desc
  limit greatest(1, least(page_size, 100));
$$;

revoke all on function public.get_my_notifications(timestamptz, integer) from public;
revoke all on function public.get_my_notifications(timestamptz, integer) from anon;
grant execute on function public.get_my_notifications(timestamptz, integer) to authenticated;

create or replace function public.get_unread_notification_count()
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::integer
  from public.notifications
  where recipient_user_id = auth.uid()
  and read_at is null;
$$;

revoke all on function public.get_unread_notification_count() from public;
revoke all on function public.get_unread_notification_count() from anon;
grant execute on function public.get_unread_notification_count() to authenticated;

create or replace function public.mark_notification_read(target_notification_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.notifications
  set read_at = now()
  where id = target_notification_id
    and recipient_user_id = auth.uid()
    and read_at is null;
end;
$$;

revoke all on function public.mark_notification_read(uuid) from public;
revoke all on function public.mark_notification_read(uuid) from anon;
grant execute on function public.mark_notification_read(uuid) to authenticated;

create or replace function public.mark_all_notifications_read()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.notifications
  set read_at = now()
  where recipient_user_id = auth.uid()
    and read_at is null;
end;
$$;

revoke all on function public.mark_all_notifications_read() from public;
revoke all on function public.mark_all_notifications_read() from anon;
grant execute on function public.mark_all_notifications_read() to authenticated;

-- ---------------------------------------------------------------------
-- toggle_like, redefined: identical behavior to the version in
-- log_likes.sql, plus one addition — a fresh like now notifies the
-- log's owner. Unlike never notifies (a removed like just leaves the
-- existing notification row alone, per the dedup-and-refresh strategy
-- above, not a deletion). Safe to re-run; this fully replaces the
-- prior function body, it doesn't layer behavior on top of it.
-- ---------------------------------------------------------------------
create or replace function public.toggle_like(target_log_id uuid)
returns table (liked boolean, like_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_liked boolean;
  v_log_owner uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_public_drink_log(target_log_id) then
    raise exception 'This log is not available to like.';
  end if;

  delete from public.log_likes
  where user_id = auth.uid() and drink_log_id = target_log_id;

  if found then
    v_liked := false;
  else
    begin
      insert into public.log_likes (user_id, drink_log_id)
      values (auth.uid(), target_log_id);
      v_liked := true;
    exception when unique_violation then
      v_liked := true;
    end;
  end if;

  if v_liked then
    select dl.user_id into v_log_owner from public.drink_logs dl where dl.id = target_log_id;
    perform public.create_notification_internal(v_log_owner, auth.uid(), 'like', target_log_id, null);
  end if;

  return query
  select v_liked, (select count(*)::integer from public.log_likes where drink_log_id = target_log_id);
end;
$$;

revoke all on function public.toggle_like(uuid) from public;
revoke all on function public.toggle_like(uuid) from anon;
grant execute on function public.toggle_like(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- create_comment: lives here, not in log_comments.sql, purely because
-- of the dependency order explained at the top of log_comments.sql —
-- by this point in the file, both public.log_comments (created by
-- log_comments.sql, which must run before this file) and
-- create_notification_internal (defined above, in this same file)
-- already exist. Enforces public-log eligibility and the length limit
-- itself rather than trusting the UI, and creates the comment plus its
-- notification as one atomic operation — a client never needs a
-- second successful request for the notification to exist.
-- ---------------------------------------------------------------------
create or replace function public.create_comment(target_log_id uuid, body_text text)
returns table (comment_id uuid, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trimmed text;
  v_id uuid;
  v_created_at timestamptz;
  v_log_owner uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_public_drink_log(target_log_id) then
    raise exception 'This log is not available for comments.';
  end if;

  v_trimmed := trim(body_text);
  if v_trimmed = '' then
    raise exception 'Comment cannot be empty.';
  end if;
  if char_length(v_trimmed) > 500 then
    raise exception 'Comment is too long.';
  end if;

  insert into public.log_comments (drink_log_id, user_id, body)
  values (target_log_id, auth.uid(), v_trimmed)
  returning id, log_comments.created_at into v_id, v_created_at;

  select dl.user_id into v_log_owner from public.drink_logs dl where dl.id = target_log_id;
  perform public.create_notification_internal(v_log_owner, auth.uid(), 'comment', target_log_id, v_id);

  return query select v_id, v_created_at;
end;
$$;

revoke all on function public.create_comment(uuid, text) from public;
revoke all on function public.create_comment(uuid, text) from anon;
grant execute on function public.create_comment(uuid, text) to authenticated;
