-- Coffee Passport: Sprint 3D, safe aggregate RPCs for café pages.
-- Run once in the SQL Editor. Additive only, does not touch or weaken
-- drink_logs RLS in any way. Both functions only ever return
-- pre-aggregated numbers, never a raw log row, user_id, caption, or
-- photo_url.
--
-- Privacy rule: an average based on exactly one rating would
-- effectively reveal that one person's private individual rating, so
-- neither function returns an average when fewer than 2 ratings exist.
-- rating_count is still returned at 1, so a café/drink with real but
-- thin activity can still be shown honestly, without exposing the
-- score itself.
--
-- SCOPE FIX (Café Page V2 follow-up): both functions now filter to
-- visibility = 'public', matching every other community-facing
-- surface in the app (get_shop_public_activity, get_public_user_
-- profile, get_friends_feed, get_shop_friends_here). Counting
-- something as an aggregate rather than a row never leaked identity,
-- but it still let a private log change PUBLIC café statistics —
-- rating_count, avg_rating, unique_visitor_count, and Top Drinks
-- ranking/rating/"Top rated" status — which is a scope bug independent
-- of the identity-safety point above: a private log should not be
-- able to move a number every viewer of this café's public page sees,
-- regardless of whether that number reveals who logged it. A user's
-- own private logs are unaffected everywhere else: "Your Passport
-- here" reads directly from drink_logs filtered to the signed-in
-- user's own id (owner access, not this function), never through
-- either of these two aggregates.

-- unique_visitor_count (Café Page V2 sprint): count(distinct user_id)
-- added to the same table scan get_shop_rating_summary already runs,
-- essentially free.
drop function if exists public.get_shop_rating_summary(uuid);

create function public.get_shop_rating_summary(target_shop_id uuid)
returns table (avg_rating numeric, rating_count integer, unique_visitor_count integer)
language sql
security definer
set search_path = public
stable
as $$
  select
    case when count(*) >= 2 then round(avg(shop_rating), 1) else null end as avg_rating,
    count(*)::integer as rating_count,
    count(distinct user_id)::integer as unique_visitor_count
  from public.drink_logs
  where shop_id = target_shop_id
    and visibility = 'public';
$$;

revoke all on function public.get_shop_rating_summary(uuid) from public;
revoke all on function public.get_shop_rating_summary(uuid) from anon;
grant execute on function public.get_shop_rating_summary(uuid) to authenticated;

-- Two-tier ranking: drinks with 2+ ratings (a real average) always sort
-- ahead of drinks with only 1 (activity only, no average), so a single
-- enthusiastic log can never outrank a drink with genuine community
-- data. Within each tier, ties break the same way: rating_count desc,
-- then drink name for full determinism. Public logs only (see the
-- SCOPE FIX note above) — a private log can never create a drink's
-- entry on this list, move its count, its average, its rank, or its
-- "Top rated" status.
create or replace function public.get_shop_top_drinks(target_shop_id uuid, result_limit integer default 10)
returns table (
  drink_id uuid,
  drink_name text,
  category text,
  avg_rating numeric,
  rating_count integer
)
language sql
security definer
set search_path = public
stable
as $$
  select
    d.id as drink_id,
    d.name as drink_name,
    d.category,
    case when count(dl.id) >= 2 then round(avg(dl.drink_rating), 1) else null end as avg_rating,
    count(dl.id)::integer as rating_count
  from public.drinks d
  join public.drink_logs dl
    on dl.drink_id = d.id
   and dl.shop_id = d.shop_id
   and dl.visibility = 'public'
  where d.shop_id = target_shop_id
  group by d.id, d.name, d.category
  order by
    case when count(dl.id) >= 2 then 0 else 1 end asc,
    case when count(dl.id) >= 2 then avg(dl.drink_rating) else null end desc nulls last,
    count(dl.id) desc,
    d.name asc
  limit result_limit;
$$;

revoke all on function public.get_shop_top_drinks(uuid, integer) from public;
revoke all on function public.get_shop_top_drinks(uuid, integer) from anon;
grant execute on function public.get_shop_top_drinks(uuid, integer) to authenticated;
