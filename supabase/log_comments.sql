-- Coffee Passport: Comments — data model, RLS, and the two comment
-- functions that don't depend on notifications existing yet.
--
-- RUN ORDER NOTE: run this file FIRST, before notifications.sql.
-- create_comment (the function that actually creates a comment) is
-- intentionally defined in notifications.sql instead of here, because
-- it needs to call create_notification_internal, and that function
-- needs public.notifications, which itself has a foreign key to
-- public.log_comments(id) — so log_comments the TABLE must exist
-- before notifications.sql runs, but create_comment the FUNCTION can't
-- be defined until AFTER notifications.sql's create_notification_internal
-- exists. Splitting it this way (table here, create_comment appended
-- at the end of notifications.sql) is what breaks that circular
-- dependency cleanly, rather than merging both features into one file
-- or introducing a third file for one function.

create table if not exists public.log_comments (
  id uuid primary key default gen_random_uuid(),
  drink_log_id uuid not null references public.drink_logs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'log_comments_body_length'
  ) then
    alter table public.log_comments
      add constraint log_comments_body_length check (char_length(body) between 1 and 500);
  end if;
end $$;

alter table public.log_comments enable row level security;

-- Same eligibility rule as likes: a log must be public to have its
-- comments read, reusing is_public_drink_log (defined in log_likes.sql)
-- rather than a second, parallel helper.
drop policy if exists "Users can view comments on public logs" on public.log_comments;
create policy "Users can view comments on public logs"
  on public.log_comments for select
  to authenticated
  using (public.is_public_drink_log(drink_log_id));

-- No INSERT/UPDATE policy for the client: creation goes exclusively
-- through create_comment (in notifications.sql, see the run-order note
-- above), which enforces public-log eligibility, auth, and the length
-- limit as one atomic, race-safe operation, and also guarantees the
-- resulting notification is never separately "forgotten" by a second
-- client request. No UPDATE policy at all, anywhere: V1 has no comment
-- editing, only delete-and-repost, per product decision.

-- DELETE is a plain RLS policy, not a function, because there's no
-- eligibility rule beyond "you're either the comment's author or the
-- post's owner" — both are simple ownership checks RLS expresses
-- completely on its own, no SECURITY DEFINER boundary-crossing needed
-- the way likes/saves/comment-creation do.
drop policy if exists "Comment author or post owner can delete" on public.log_comments;
create policy "Comment author or post owner can delete"
  on public.log_comments for delete
  to authenticated
  using (
    auth.uid() = user_id
    or auth.uid() = (select dl.user_id from public.drink_logs dl where dl.id = drink_log_id)
  );

create index if not exists log_comments_drink_log_idx on public.log_comments (drink_log_id, created_at);
create index if not exists log_comments_user_idx on public.log_comments (user_id);

-- ---------------------------------------------------------------------
-- delete_comment: a thin RPC wrapper, not because RLS can't already
-- enforce the delete (it can, and does, via the policy above — this
-- would work fine as a direct supabase.from("log_comments").delete()
-- too), but for a consistent, single mutation surface with the rest of
-- this social system's RPC-first convention, and to give a clean
-- idempotent "already gone" result instead of a client needing to
-- distinguish "0 rows deleted because not found" from "0 rows deleted
-- because not authorized".
-- ---------------------------------------------------------------------
create or replace function public.delete_comment(target_comment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_comment_user_id uuid;
  v_log_owner_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select lc.user_id, dl.user_id
  into v_comment_user_id, v_log_owner_id
  from public.log_comments lc
  join public.drink_logs dl on dl.id = lc.drink_log_id
  where lc.id = target_comment_id;

  if v_comment_user_id is null then
    -- Already gone; idempotent delete, not an error.
    return;
  end if;

  if auth.uid() != v_comment_user_id and auth.uid() != v_log_owner_id then
    raise exception 'Not authorized to delete this comment.';
  end if;

  delete from public.log_comments where id = target_comment_id;
end;
$$;

revoke all on function public.delete_comment(uuid) from public;
revoke all on function public.delete_comment(uuid) from anon;
grant execute on function public.delete_comment(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- get_log_comments: returns the most recent page (created_at DESC),
-- capped at page_size. Callers reverse this into oldest-first display
-- order client-side (see lib/social/comments-actions.ts) — that's what
-- makes "before_created_at" a correct "load EARLIER comments" cursor:
-- the first page is the tail of the conversation nearest the input,
-- and paging with an older-than cursor walks backward through history,
-- exactly the chat-thread pattern this is meant to feel like.
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
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    lc.id as comment_id,
    lc.user_id,
    p.username,
    p.first_name,
    p.avatar_url,
    lc.body,
    lc.created_at
  from public.log_comments lc
  join public.profiles p on p.id = lc.user_id
  where lc.drink_log_id = target_log_id
    and public.is_public_drink_log(target_log_id)
    and (before_created_at is null or lc.created_at < before_created_at)
  order by lc.created_at desc
  limit greatest(1, least(page_size, 100));
$$;

revoke all on function public.get_log_comments(uuid, timestamptz, integer) from public;
revoke all on function public.get_log_comments(uuid, timestamptz, integer) from anon;
grant execute on function public.get_log_comments(uuid, timestamptz, integer) to authenticated;
