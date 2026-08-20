-- Coffee Passport: Sprint 3F.5, ONE-TIME historical achievement backfill.
-- Run once in the SQL Editor, after passport_achievements.sql and
-- before relying on evaluate_passport_achievements() going forward.
--
-- Purpose: existing users' achievements should carry a historically
-- accurate earned_at, the actual logged_at of the log that crossed
-- each threshold, not "now" just because this feature happened to
-- ship today. Every insert below uses on conflict do nothing, so this
-- script is safe to run more than once, rerunning it is a no-op for
-- anyone already backfilled, this is intentionally a plain SQL script
-- rather than a callable function, nothing here needs to be an
-- app-facing RPC, it's meant to be run deliberately, once, by you.
--
-- After this runs, evaluate_passport_achievements() takes over for all
-- future qualification, and it always uses real time for earned_at
-- from that point on, exactly as intended: the historical record stays
-- historically accurate, new achievements are dated when Coffee
-- Passport actually recognized them.

-- FIRST SIP: each user's first log, chronologically.
insert into public.passport_achievements (user_id, achievement_key, earned_at)
select user_id, 'first_sip', logged_at
from (
  select
    user_id,
    logged_at,
    row_number() over (partition by user_id order by logged_at asc, created_at asc, id asc) as rn
  from public.drink_logs
) ranked
where rn = 1
on conflict (user_id, achievement_key) do nothing;

-- COFFEE 25 / COFFEE 100: the 25th and 100th COFFEE log specifically,
-- chronologically, tea logs do not count toward these, Tea Curious
-- exists separately for tea.
insert into public.passport_achievements (user_id, achievement_key, earned_at)
select user_id, 'coffee_25', logged_at
from (
  select
    user_id,
    logged_at,
    row_number() over (partition by user_id order by logged_at asc, created_at asc, id asc) as rn
  from public.drink_logs
  where beverage_category = 'coffee'
) ranked
where rn = 25
on conflict (user_id, achievement_key) do nothing;

insert into public.passport_achievements (user_id, achievement_key, earned_at)
select user_id, 'coffee_100', logged_at
from (
  select
    user_id,
    logged_at,
    row_number() over (partition by user_id order by logged_at asc, created_at asc, id asc) as rn
  from public.drink_logs
  where beverage_category = 'coffee'
) ranked
where rn = 100
on conflict (user_id, achievement_key) do nothing;

-- SHOP EXPLORER 5 / 10: find each shop's first visit per user, rank
-- those first-visits chronologically, the crossing log is whichever
-- first-visit is the 5th (or 10th) in that ranking.
with first_shop_visit as (
  select user_id, shop_id, min(logged_at) as first_logged_at
  from public.drink_logs
  group by user_id, shop_id
),
ranked_shops as (
  select
    user_id,
    first_logged_at,
    row_number() over (partition by user_id order by first_logged_at asc, shop_id asc) as shop_rn
  from first_shop_visit
)
insert into public.passport_achievements (user_id, achievement_key, earned_at)
select user_id, 'shop_explorer_5', first_logged_at
from ranked_shops
where shop_rn = 5
on conflict (user_id, achievement_key) do nothing;

with first_shop_visit as (
  select user_id, shop_id, min(logged_at) as first_logged_at
  from public.drink_logs
  group by user_id, shop_id
),
ranked_shops as (
  select
    user_id,
    first_logged_at,
    row_number() over (partition by user_id order by first_logged_at asc, shop_id asc) as shop_rn
  from first_shop_visit
)
insert into public.passport_achievements (user_id, achievement_key, earned_at)
select user_id, 'shop_explorer_10', first_logged_at
from ranked_shops
where shop_rn = 10
on conflict (user_id, achievement_key) do nothing;

-- CITY EXPLORER 5: same pattern, grouped by normalized (city, state)
-- instead of shop_id, null-city shops excluded entirely, they were
-- never counted toward exploration anywhere else in the app either.
with first_city_visit as (
  select
    dl.user_id,
    lower(trim(s.city)) as city_key,
    lower(trim(s.state)) as state_key,
    min(dl.logged_at) as first_logged_at
  from public.drink_logs dl
  join public.shops s on s.id = dl.shop_id
  where s.city is not null and s.state is not null
  group by dl.user_id, lower(trim(s.city)), lower(trim(s.state))
),
ranked_cities as (
  select
    user_id,
    first_logged_at,
    row_number() over (partition by user_id order by first_logged_at asc, city_key asc, state_key asc) as city_rn
  from first_city_visit
)
insert into public.passport_achievements (user_id, achievement_key, earned_at)
select user_id, 'city_explorer_5', first_logged_at
from ranked_cities
where city_rn = 5
on conflict (user_id, achievement_key) do nothing;

-- TEA CURIOUS: the 5th tea log, chronologically.
insert into public.passport_achievements (user_id, achievement_key, earned_at)
select user_id, 'tea_curious', logged_at
from (
  select
    user_id,
    logged_at,
    row_number() over (partition by user_id order by logged_at asc, created_at asc, id asc) as tea_rn
  from public.drink_logs
  where beverage_category = 'tea'
) ranked
where tea_rn = 5
on conflict (user_id, achievement_key) do nothing;
