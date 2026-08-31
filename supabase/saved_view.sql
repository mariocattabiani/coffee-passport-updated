-- Coffee Passport: Phase 2A.1 — Saved / Wishlist view.
-- Run once in the SQL Editor, after saves.sql. Additive only, does not
-- touch saves' existing RLS or its uniqueness/FK behavior at all.
--
-- get_my_saves is SECURITY DEFINER not to bypass ownership (saves'
-- own RLS already lets a user select their own rows directly), but
-- because showing provenance ("saved from Mike's post") requires
-- joining drink_logs for a log that may belong to a DIFFERENT user —
-- drink_logs' SELECT RLS is owner-only, so a plain query as the
-- calling user would never see someone else's log even if it's
-- public. This reuses the exact SECURITY DEFINER pattern already
-- established for get_public_feed etc., generalized to one more case,
-- and it hardcodes `where sv.user_id = auth.uid()` itself rather than
-- trusting anything from the caller, so it can never return another
-- user's saves despite running with elevated function-owner
-- privileges.

create or replace function public.get_my_saves(page_size integer default 100)
returns table (
  save_id uuid,
  shop_id uuid,
  shop_name text,
  city text,
  state text,
  drink_id uuid,
  drink_name text,
  category text,
  created_at timestamptz,
  source_log_id uuid,
  -- true only when source_log_id both exists and currently points to
  -- a public log — the one signal the UI is allowed to act on. A
  -- deleted source log already comes through as source_log_id = null
  -- (saves.source_log_id is ON DELETE SET NULL), and a source log that
  -- has since gone private simply fails the `dl.visibility = 'public'`
  -- join condition below, landing in the exact same "not visible"
  -- state — either way, nothing about a private/deleted post is ever
  -- exposed here beyond this one boolean, which itself reveals
  -- nothing (the viewer already knows they saved something).
  source_visible boolean,
  source_first_name text,
  source_username text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    sv.id as save_id,
    s.id as shop_id,
    s.name as shop_name,
    s.city,
    s.state,
    d.id as drink_id,
    d.name as drink_name,
    d.category,
    sv.created_at,
    sv.source_log_id,
    (dl.id is not null) as source_visible,
    p.first_name as source_first_name,
    p.username as source_username
  from public.saves sv
  join public.shops s on s.id = sv.shop_id
  left join public.drinks d on d.id = sv.drink_id
  left join public.drink_logs dl
    on dl.id = sv.source_log_id and dl.visibility = 'public'
  left join public.profiles p on p.id = dl.user_id
  where sv.user_id = auth.uid()
  order by sv.created_at desc
  limit greatest(1, least(page_size, 200));
$$;

revoke all on function public.get_my_saves(integer) from public;
revoke all on function public.get_my_saves(integer) from anon;
grant execute on function public.get_my_saves(integer) to authenticated;
