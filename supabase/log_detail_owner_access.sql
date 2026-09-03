-- Coffee Passport: get_public_log, owner-access fix.
--
-- Discovered while building the Passport grid: Passport tiles link to
-- /logs/[id] for ALL of the owner's own logs, public or private (the
-- Passport grid is the owner's private history and always has been).
-- But get_public_log's WHERE clause only ever matched
-- `visibility = 'public'`, so a log's own owner got null back — the
-- exact same "not found" a stranger would see — for any of their own
-- private logs. That's a genuine bug this sprint surfaced, not a
-- feature this sprint invented: the owner of a log must always be
-- able to view it, that's true regardless of whether the Passport
-- grid redesign happened at all.
--
-- RUN ORDER: run after photo_focal_position.sql (this is the next
-- revision of the same function). This is the ONLY SQL this sprint
-- needed — no new columns, no new tables, nothing for the grid
-- presentation itself, which is why this file exists in isolation
-- rather than folded into a broader migration.
--
-- Fix: the WHERE clause now matches `visibility = 'public' OR
-- user_id = auth.uid()` — a private log remains completely invisible
-- to everyone except its owner, exactly as before, this only adds the
-- owner's own access back. Also adds `visibility` to the return so
-- the page can decide what's appropriate to show for a private log
-- (no Like/Comment/Save UI — there's no one else who could ever
-- interact with it) versus a public one.

drop function if exists public.get_public_log(uuid);

create function public.get_public_log(target_log_id uuid)
returns table (
  log_id uuid,
  logged_at timestamptz,
  drink_rating numeric,
  caption text,
  temperature text,
  photo_path text,
  photo_position_x numeric,
  photo_position_y numeric,
  drink_id uuid,
  drink_name text,
  category text,
  shop_id uuid,
  shop_name text,
  shop_city text,
  shop_state text,
  owner_user_id uuid,
  visibility text,
  username text,
  first_name text,
  avatar_url text,
  like_count integer,
  viewer_has_liked boolean,
  viewer_has_saved boolean,
  comment_count integer
)
language sql
security definer
set search_path = public
stable
as $$
  select
    dl.id as log_id,
    dl.logged_at,
    dl.drink_rating,
    dl.caption,
    dl.temperature,
    dl.photo_url as photo_path,
    dl.photo_position_x,
    dl.photo_position_y,
    d.id as drink_id,
    d.name as drink_name,
    d.category,
    s.id as shop_id,
    s.name as shop_name,
    s.city as shop_city,
    s.state as shop_state,
    dl.user_id as owner_user_id,
    dl.visibility,
    p.username,
    p.first_name,
    p.avatar_url,
    coalesce(lc.n, 0)::integer as like_count,
    coalesce(vl.liked, false) as viewer_has_liked,
    coalesce(vs.saved, false) as viewer_has_saved,
    coalesce(cc.n, 0)::integer as comment_count
  from public.drink_logs dl
  join public.drinks d on d.id = dl.drink_id
  join public.shops s on s.id = dl.shop_id
  join public.profiles p on p.id = dl.user_id
  left join lateral (
    select count(*) as n from public.log_likes ll where ll.drink_log_id = dl.id
  ) lc on true
  left join lateral (
    select true as liked from public.log_likes ll2
    where ll2.drink_log_id = dl.id and ll2.user_id = auth.uid()
  ) vl on true
  left join lateral (
    select true as saved from public.saves sv
    where sv.user_id = auth.uid() and sv.shop_id = dl.shop_id and sv.drink_id = dl.drink_id
  ) vs on true
  left join lateral (
    select count(*) as n from public.log_comments lcm where lcm.drink_log_id = dl.id
  ) cc on true
  where dl.id = target_log_id
    and (dl.visibility = 'public' or dl.user_id = auth.uid());
$$;

revoke all on function public.get_public_log(uuid) from public;
revoke all on function public.get_public_log(uuid) from anon;
grant execute on function public.get_public_log(uuid) to authenticated;
