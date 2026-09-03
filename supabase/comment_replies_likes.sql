-- Coffee Passport: comment replies + comment likes.
--
-- RUN ORDER: run after notifications.sql and log_comments.sql (needs
-- is_public_drink_log, log_comments, and create_notification_internal
-- to already exist). Additive only. Existing comments and existing
-- notifications are fully preserved — every existing log_comments row
-- simply gets parent_comment_id = null, reply_to_user_id = null,
-- which is exactly what a top-level comment already was.
--
-- This file also redefines delete_comment (originally from
-- log_comments.sql) to return authoritative deleted_count/
-- comment_count instead of nothing — the same "redefine a function
-- from an earlier file, in the file that needs the new behavior"
-- pattern already used elsewhere (e.g. notifications.sql redefining
-- toggle_like from log_likes.sql).

-- ---------------------------------------------------------------------
-- log_comments: add the reply relationship.
-- parent_comment_id is always the ROOT top-level comment, never a
-- reply-to-a-reply — the app enforces exactly one indentation level by
-- resolving to the root here in create_comment below, not by allowing
-- arbitrarily deep parent chains. reply_to_user_id is separate from
-- parent_comment_id on purpose: it records WHO was actually being
-- replied to (which may be a different person than the root comment's
-- author, if replying to someone else's reply within the same
-- thread), used for "Replying to @username" display and for sending
-- the reply notification to the right person, not just the thread's
-- original author.
-- ---------------------------------------------------------------------
alter table public.log_comments
  add column if not exists parent_comment_id uuid references public.log_comments(id) on delete cascade,
  add column if not exists reply_to_user_id uuid references public.profiles(id) on delete set null;

create index if not exists log_comments_parent_idx on public.log_comments (parent_comment_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'log_comments_parent_is_root'
  ) then
    -- Defense in depth: even if something bypassed create_comment,
    -- the database itself won't accept a parent_comment_id that
    -- points to a row which is itself a reply (has its own non-null
    -- parent_comment_id) — this check alone can't fully enforce that
    -- without a self-referential lookup, which a CHECK constraint
    -- can't do; the real enforcement is in create_comment, this
    -- constraint just documents the intent and blocks the one thing
    -- SQL constraints can express here.
    alter table public.log_comments
      add constraint log_comments_parent_is_root
      check (parent_comment_id is null or parent_comment_id != id);
  end if;
end $$;

-- ---------------------------------------------------------------------
-- log_comment_likes: identical shape/pattern to log_likes (post
-- likes), scoped to individual comments instead. Same "no client
-- INSERT/DELETE policy, mutation only through toggle_comment_like"
-- convention as every other social table in this project.
-- ---------------------------------------------------------------------
create table if not exists public.log_comment_likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  comment_id uuid not null references public.log_comments(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, comment_id)
);

alter table public.log_comment_likes enable row level security;

drop policy if exists "Users can view likes on visible comments" on public.log_comment_likes;
create policy "Users can view likes on visible comments"
  on public.log_comment_likes for select
  to authenticated
  using (
    exists (
      select 1 from public.log_comments lc
      where lc.id = comment_id and public.is_public_drink_log(lc.drink_log_id)
    )
  );

revoke insert, update, delete on public.log_comment_likes from authenticated;
revoke insert, update, delete on public.log_comment_likes from anon;

create index if not exists log_comment_likes_comment_idx on public.log_comment_likes (comment_id);

-- ---------------------------------------------------------------------
-- notifications: widen the type check and add a comment-like dedup
-- key alongside the existing post-like one. comment_reply gets NO
-- dedup — every genuinely new reply is its own distinct event, same
-- as top-level comments already work. comment_like gets the same
-- "toggle reuses/refreshes one row" treatment as post likes, keyed by
-- comment_id (not drink_log_id) so liking two different comments on
-- the same post are correctly two independent notifications.
-- ---------------------------------------------------------------------
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check
  check (type in ('like', 'comment', 'comment_reply', 'comment_like'));

create unique index if not exists notifications_comment_like_dedup_key
  on public.notifications (recipient_user_id, actor_user_id, comment_id, type)
  where type = 'comment_like';

-- ---------------------------------------------------------------------
-- create_notification_internal, redefined: adds the comment_like
-- dedup branch. Same function, same signature, same "not granted to
-- authenticated" lockdown — this fully replaces the version in
-- notifications.sql, it doesn't layer behavior on top of it.
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
  if p_recipient_user_id = p_actor_user_id then
    return;
  end if;

  if p_type = 'like' then
    insert into public.notifications (recipient_user_id, actor_user_id, type, drink_log_id, comment_id, created_at, read_at)
    values (p_recipient_user_id, p_actor_user_id, 'like', p_drink_log_id, null, now(), null)
    on conflict (recipient_user_id, actor_user_id, drink_log_id, type)
      where type = 'like'
    do update set created_at = excluded.created_at, read_at = null;
  elsif p_type = 'comment_like' then
    insert into public.notifications (recipient_user_id, actor_user_id, type, drink_log_id, comment_id, created_at, read_at)
    values (p_recipient_user_id, p_actor_user_id, 'comment_like', p_drink_log_id, p_comment_id, now(), null)
    on conflict (recipient_user_id, actor_user_id, comment_id, type)
      where type = 'comment_like'
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
-- create_comment, redefined: adds optional reply_to_comment_id AND an
-- authoritative comment_count (total comments — top-level plus
-- replies — for target_log_id after this insert). The client uses
-- that count directly rather than deriving it from how many comments
-- happen to be loaded locally, which is a real bug: get_log_comments
-- paginates by top-level thread, so a locally-loaded array's length
-- was never the same number as the feed's own total in the first
-- place. Return-shape change requires DROP first (CREATE OR REPLACE
-- can't change a RETURNS TABLE function's column set).
--
-- Notification behavior unchanged: a reply notifies whoever was
-- actually replied to (comment_reply). The post owner separately gets
-- a comment notification for new activity on their post — UNLESS
-- they're the same person as the reply target (already notified) or
-- the actor themselves (create_notification_internal's own self-
-- notification guard handles that case) — never two notifications to
-- the same recipient for one action.
-- ---------------------------------------------------------------------
drop function if exists public.create_comment(uuid, text, uuid);

create function public.create_comment(
  target_log_id uuid,
  body_text text,
  reply_to_comment_id uuid default null
)
returns table (
  comment_id uuid,
  created_at timestamptz,
  parent_comment_id uuid,
  reply_to_user_id uuid,
  comment_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trimmed text;
  v_id uuid;
  v_created_at timestamptz;
  v_log_owner uuid;
  v_parent_id uuid;
  v_reply_to_user_id uuid;
  v_reply_to_root uuid;
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

  if reply_to_comment_id is not null then
    select lc.user_id, coalesce(lc.parent_comment_id, lc.id)
    into v_reply_to_user_id, v_reply_to_root
    from public.log_comments lc
    where lc.id = reply_to_comment_id and lc.drink_log_id = target_log_id;

    if v_reply_to_user_id is null then
      raise exception 'The comment you are replying to no longer exists.';
    end if;

    v_parent_id := v_reply_to_root;
  else
    v_parent_id := null;
    v_reply_to_user_id := null;
  end if;

  insert into public.log_comments (drink_log_id, user_id, body, parent_comment_id, reply_to_user_id)
  values (target_log_id, auth.uid(), v_trimmed, v_parent_id, v_reply_to_user_id)
  returning id, log_comments.created_at into v_id, v_created_at;

  select dl.user_id into v_log_owner from public.drink_logs dl where dl.id = target_log_id;

  if v_parent_id is not null then
    perform public.create_notification_internal(v_reply_to_user_id, auth.uid(), 'comment_reply', target_log_id, v_id);
    if v_log_owner != v_reply_to_user_id then
      perform public.create_notification_internal(v_log_owner, auth.uid(), 'comment', target_log_id, v_id);
    end if;
  else
    perform public.create_notification_internal(v_log_owner, auth.uid(), 'comment', target_log_id, v_id);
  end if;

  return query
  select
    v_id,
    v_created_at,
    v_parent_id,
    v_reply_to_user_id,
    (select count(*)::integer from public.log_comments where drink_log_id = target_log_id);
end;
$$;

revoke all on function public.create_comment(uuid, text, uuid) from public;
revoke all on function public.create_comment(uuid, text, uuid) from anon;
grant execute on function public.create_comment(uuid, text, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- toggle_comment_like: identical pattern to toggle_like (post likes),
-- scoped to a comment. A fresh like notifies the comment's author;
-- unlike never notifies (leaves the existing notification row alone,
-- same dedup-and-refresh strategy as everywhere else in this system).
-- ---------------------------------------------------------------------
create or replace function public.toggle_comment_like(target_comment_id uuid)
returns table (liked boolean, like_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_liked boolean;
  v_comment_author uuid;
  v_log_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select lc.user_id, lc.drink_log_id into v_comment_author, v_log_id
  from public.log_comments lc
  where lc.id = target_comment_id;

  if v_comment_author is null then
    raise exception 'This comment no longer exists.';
  end if;

  if not public.is_public_drink_log(v_log_id) then
    raise exception 'This comment is not available.';
  end if;

  delete from public.log_comment_likes
  where user_id = auth.uid() and comment_id = target_comment_id;

  if found then
    v_liked := false;
  else
    begin
      insert into public.log_comment_likes (user_id, comment_id)
      values (auth.uid(), target_comment_id);
      v_liked := true;
    exception when unique_violation then
      v_liked := true;
    end;
  end if;

  if v_liked then
    perform public.create_notification_internal(v_comment_author, auth.uid(), 'comment_like', v_log_id, target_comment_id);
  end if;

  return query
  select v_liked, (select count(*)::integer from public.log_comment_likes where comment_id = target_comment_id);
end;
$$;

revoke all on function public.toggle_comment_like(uuid) from public;
revoke all on function public.toggle_comment_like(uuid) from anon;
grant execute on function public.toggle_comment_like(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- get_log_comments, redefined: paginates by TOP-LEVEL comments only
-- (before_created_at now filters parent_comment_id is null rows), and
-- for the page of top-level comments returned, ALSO returns every one
-- of their replies in the same call — a thread is never split across
-- pages, which is the actual requirement ("does not split/thread
-- replies in a confusing way"), not just a nice-to-have. Reply volume
-- per V1 thread is expected to be small (no deep nesting, no infinite
-- scroll within a thread), so this stays bounded.
--
-- Returns a flat list; the client groups by (parent_comment_id ?? id)
-- to build the one-level visual tree — see comments-actions.ts.
-- ---------------------------------------------------------------------
create or replace function public.get_log_comments(
  target_log_id uuid,
  before_created_at timestamptz default null,
  page_size integer default 30
)
returns table (
  comment_id uuid,
  user_id uuid,
  username text,
  first_name text,
  avatar_url text,
  body text,
  created_at timestamptz,
  parent_comment_id uuid,
  reply_to_user_id uuid,
  reply_to_username text,
  reply_to_first_name text,
  like_count integer,
  viewer_has_liked boolean,
  is_top_level boolean
)
language sql
security definer
set search_path = public
stable
as $$
  with top_level_page as (
    select lc.id, lc.created_at
    from public.log_comments lc
    where lc.drink_log_id = target_log_id
      and lc.parent_comment_id is null
      and public.is_public_drink_log(target_log_id)
      and (before_created_at is null or lc.created_at < before_created_at)
    order by lc.created_at desc
    limit greatest(1, least(page_size, 100))
  ),
  page_comments as (
    select lc.*, true as is_top
    from public.log_comments lc
    join top_level_page tp on lc.id = tp.id
    union all
    select lc.*, false as is_top
    from public.log_comments lc
    join top_level_page tp on lc.parent_comment_id = tp.id
  )
  select
    pc.id as comment_id,
    pc.user_id,
    p.username,
    p.first_name,
    p.avatar_url,
    pc.body,
    pc.created_at,
    pc.parent_comment_id,
    pc.reply_to_user_id,
    rp.username as reply_to_username,
    rp.first_name as reply_to_first_name,
    coalesce(lk.n, 0)::integer as like_count,
    coalesce(vl.liked, false) as viewer_has_liked,
    pc.is_top as is_top_level
  from page_comments pc
  join public.profiles p on p.id = pc.user_id
  left join public.profiles rp on rp.id = pc.reply_to_user_id
  left join lateral (
    select count(*) as n from public.log_comment_likes lcl where lcl.comment_id = pc.id
  ) lk on true
  left join lateral (
    select true as liked from public.log_comment_likes lcl2
    where lcl2.comment_id = pc.id and lcl2.user_id = auth.uid()
  ) vl on true
  order by pc.created_at asc;
$$;

revoke all on function public.get_log_comments(uuid, timestamptz, integer) from public;
revoke all on function public.get_log_comments(uuid, timestamptz, integer) from anon;
grant execute on function public.get_log_comments(uuid, timestamptz, integer) to authenticated;

-- ---------------------------------------------------------------------
-- delete_comment, redefined: was `returns void` in log_comments.sql,
-- now returns an authoritative deleted_count (how many rows this
-- delete actually removed — the comment itself, plus every reply
-- under it if it was a top-level comment, since the FK cascades those
-- automatically) and comment_count (the log's true total remaining
-- comments afterward). The caller must never assume a top-level
-- delete only removes 1 row, or derive the new total from how many
-- replies happened to be loaded locally — both counts are computed
-- here, from the database, after the delete has actually happened.
-- Return-shape change (void -> table) requires DROP first.
-- ---------------------------------------------------------------------
drop function if exists public.delete_comment(uuid);

create function public.delete_comment(target_comment_id uuid)
returns table (
  deleted_count integer,
  comment_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_comment_user_id uuid;
  v_log_owner_id uuid;
  v_log_id uuid;
  v_deleted_count integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select lc.user_id, dl.user_id, lc.drink_log_id
  into v_comment_user_id, v_log_owner_id, v_log_id
  from public.log_comments lc
  join public.drink_logs dl on dl.id = lc.drink_log_id
  where lc.id = target_comment_id;

  if v_log_id is null then
    raise exception 'This comment no longer exists.';
  end if;

  if auth.uid() != v_comment_user_id and auth.uid() != v_log_owner_id then
    raise exception 'Not authorized to delete this comment.';
  end if;

  -- Count everything this delete is about to remove BEFORE removing
  -- it: the comment itself, plus any replies whose parent_comment_id
  -- points at it (only ever non-empty for a top-level comment, a
  -- reply has no children of its own under the one-level model).
  select count(*)::integer into v_deleted_count
  from public.log_comments
  where id = target_comment_id or parent_comment_id = target_comment_id;

  delete from public.log_comments where id = target_comment_id;

  return query
  select
    v_deleted_count,
    (select count(*)::integer from public.log_comments where drink_log_id = v_log_id);
end;
$$;

revoke all on function public.delete_comment(uuid) from public;
revoke all on function public.delete_comment(uuid) from anon;
grant execute on function public.delete_comment(uuid) to authenticated;
