-- Coffee Passport: Phase 2A — Likes on public coffee logs.
-- Run once in the SQL Editor, after public_feed.sql and BEFORE
-- saves.sql (saves.sql's toggle_save reuses the is_public_drink_log
-- helper defined here). Additive only, does not touch or weaken
-- drink_logs RLS.

create table if not exists public.log_likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  drink_log_id uuid not null references public.drink_logs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, drink_log_id)
);

alter table public.log_likes enable row level security;

-- ---------------------------------------------------------------------
-- is_public_drink_log: the same pattern as is_public_drink_photo in
-- public_feed.sql, generalized to any log id rather than a photo path.
-- drink_logs SELECT RLS stays owner-only throughout — a plain subquery
-- inside a log_likes/saves policy would run under the QUERYING user's
-- own privileges and would only ever see their own rows, silently
-- granting nothing for anyone else's post. This narrow SECURITY
-- DEFINER function is what lets a like/save-eligibility check see
-- across that boundary safely, returning only a boolean, never a row.
-- ---------------------------------------------------------------------
create or replace function public.is_public_drink_log(target_log_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.drink_logs dl
    where dl.id = target_log_id
    and dl.visibility = 'public'
  );
$$;

revoke all on function public.is_public_drink_log(uuid) from public;
revoke all on function public.is_public_drink_log(uuid) from anon;
grant execute on function public.is_public_drink_log(uuid) to authenticated;

-- Likes on a public log are visible (existence + count, via the feed
-- RPCs, not raw row browsing) since a like is inherently tied to a
-- post other people can already see. A private log's likes are never
-- readable through this policy once the log itself isn't public,
-- matching exactly how its photo/content already disappear.
drop policy if exists "Users can view likes on public logs" on public.log_likes;

create policy "Users can view likes on public logs"
  on public.log_likes for select
  to authenticated
  using (public.is_public_drink_log(drink_log_id));

-- Deliberately no INSERT/UPDATE/DELETE policy here, for the same
-- reason as saves: all mutation goes through toggle_like below, one
-- atomic, race-safe, auth.uid()-derived operation rather than two
-- independently callable client mutations that would need their own
-- (harder to get right) public-log-eligibility check duplicated into
-- RLS with-check clauses.

create index if not exists log_likes_drink_log_idx on public.log_likes (drink_log_id);
-- No separate index is needed for "does auth.uid() like log X": the
-- primary key (user_id, drink_log_id) already leads with user_id,
-- which is a constant (auth.uid()) for every lookup the feed RPCs do,
-- making it an efficient index scan as-is.

-- ---------------------------------------------------------------------
-- toggle_like: the only way a like is ever created or removed. A log
-- must be public at the moment of the call — enforced here, in the
-- database, not left to the UI hiding the button on private posts.
-- ---------------------------------------------------------------------
create or replace function public.toggle_like(target_log_id uuid)
returns table (liked boolean, like_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_liked boolean;
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
      -- A concurrent request already liked it; treat as success, not
      -- an error — database uniqueness (the primary key) is the final
      -- authority on whether a duplicate was actually created, and it
      -- wasn't.
      v_liked := true;
    end;
  end if;

  return query
  select v_liked, (select count(*)::integer from public.log_likes where drink_log_id = target_log_id);
end;
$$;

revoke all on function public.toggle_like(uuid) from public;
revoke all on function public.toggle_like(uuid) from anon;
grant execute on function public.toggle_like(uuid) to authenticated;
