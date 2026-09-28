-- Coffee Passport: Achievement Performance Remediation — one-time
-- retroactive safety net.
--
-- RUN ONCE, after deploying the write-time evaluation change (the
-- updated lib/drink-logs/actions.ts / app/dashboard, app/explore,
-- app/passport, app/passport/stamps). Not an RPC, not called from the
-- app — a plain script, run deliberately by you, exactly like
-- passport_achievements_backfill.sql and the retroactive pass at the
-- bottom of passport_achievements_v2.sql before it.
--
-- WHY THIS EXISTS
-- Before this remediation, evaluate_passport_achievements() ran on
-- every Dashboard/Explore/Passport/Stamps page view, so any active
-- user who had visited at least one of those four pages was already
-- fully caught up as of their last visit. After this remediation,
-- evaluation only happens as a write-time side effect of creating or
-- editing a log. That closes the gap going forward, but it does
-- nothing for drink_logs rows that already existed BEFORE this
-- shipped, for the (small, but real) set of users who qualify for an
-- achievement from historical logs alone and have never triggered a
-- create/update since — e.g. someone who only ever used /log to add
-- entries and never happened to open Dashboard, Explore, Passport, or
-- Stamps at a moment when a threshold had just been crossed. This
-- script closes that gap once, retroactively, without reintroducing
-- evaluation on every page load.
--
-- SAFETY
-- Every insert uses ON CONFLICT (user_id, achievement_key) DO
-- NOTHING, exactly like every other award path in this schema, so:
--   - rerunning this is always a no-op for anyone already awarded
--   - it can never duplicate a row
--   - it never touches earned_at or seen_at on an existing row
--   - it never revokes anything (no delete/update here, insert only)
--   - the 30 achievement_key values and their thresholds are copied
--     verbatim from evaluate_passport_achievements() in
--     passport_achievements_v2.sql — nothing added, removed, or
--     changed here, this is strictly a "catch up any stragglers"
--     pass using the exact same rules the live evaluator uses.
--
-- This does not create or replace any function, and does not alter
-- the passport_achievements table. It is safe to run against a live
-- database at any time.

with log_rows as (
  select
    dl.*,
    lower(regexp_replace(trim(d.name), '\s+', ' ', 'g')) as drink_name,
    s.location_id,
    lower(trim(s.city)) as city_name,
    lower(trim(s.state)) as state_name,
    lower(trim(s.country)) as country_name
  from public.drink_logs dl
  join public.drinks d on d.id = dl.drink_id
  join public.shops s on s.id = dl.shop_id
),
shop_counts as (
  select user_id, shop_id, count(*)::integer as visits
  from log_rows
  group by user_id, shop_id
),
max_shop_counts as (
  select user_id, max(visits)::integer as max_shop_visits
  from shop_counts
  group by user_id
),
stats as (
  select
    lr.user_id,
    count(*)::integer as total_logs,
    count(*) filter (where beverage_category = 'coffee')::integer as coffee_logs,
    count(*) filter (where beverage_category = 'tea')::integer as tea_logs,
    count(distinct shop_id)::integer as unique_shops,
    count(distinct case
      when location_id is not null then 'location:' || location_id::text
      when city_name is not null then 'fallback:' || city_name || '|' || coalesce(state_name, '') || '|' || coalesce(country_name, '')
      else null
    end)::integer as unique_cities,
    count(distinct state_name) filter (
      where state_name is not null and country_name = 'united states'
    )::integer as unique_states,
    count(distinct drink_name)::integer as unique_drinks,
    count(*) filter (where photo_url is not null)::integer as photo_logs,
    count(*) filter (where nullif(trim(caption), '') is not null)::integer as caption_logs,
    count(*) filter (where drink_rating = 5)::integer as five_star_logs,
    count(*) filter (where temperature = 'hot')::integer as hot_logs,
    count(*) filter (where temperature = 'iced')::integer as iced_logs,
    count(*) filter (where drink_name = 'latte')::integer as latte_logs,
    count(*) filter (where drink_name = 'cappuccino')::integer as cappuccino_logs,
    count(*) filter (where drink_name = 'flat white')::integer as flat_white_logs,
    count(*) filter (where drink_name = 'cortado')::integer as cortado_logs,
    count(*) filter (where drink_name = 'espresso')::integer as espresso_logs,
    count(*) filter (where drink_name = 'americano')::integer as americano_logs,
    count(*) filter (where drink_name = 'drip coffee')::integer as drip_logs,
    count(*) filter (where drink_name in ('cold brew', 'nitro cold brew'))::integer as cold_brew_logs,
    count(*) filter (where drink_name = 'mocha')::integer as mocha_logs,
    count(*) filter (where drink_name = 'macchiato')::integer as macchiato_logs,
    count(*) filter (where drink_name = 'chai latte')::integer as chai_logs,
    count(*) filter (where drink_name = 'matcha')::integer as matcha_logs,
    coalesce(msc.max_shop_visits, 0)::integer as max_shop_visits
  from log_rows lr
  left join max_shop_counts msc on msc.user_id = lr.user_id
  group by lr.user_id, msc.max_shop_visits
),
qualifying as (
  select s.user_id, rule.achievement_key
  from stats s
  cross join lateral (values
    ('first_sip', s.total_logs >= 1), ('coffee_25', s.coffee_logs >= 25), ('coffee_100', s.coffee_logs >= 100),
    ('shop_explorer_5', s.unique_shops >= 5), ('shop_explorer_10', s.unique_shops >= 10), ('city_explorer_5', s.unique_cities >= 5),
    ('tea_curious', s.tea_logs >= 5), ('first_latte', s.latte_logs >= 1), ('first_cappuccino', s.cappuccino_logs >= 1),
    ('first_flat_white', s.flat_white_logs >= 1), ('first_cortado', s.cortado_logs >= 1), ('first_espresso', s.espresso_logs >= 1),
    ('first_americano', s.americano_logs >= 1), ('first_drip_coffee', s.drip_logs >= 1), ('first_cold_brew', s.cold_brew_logs >= 1),
    ('first_mocha', s.mocha_logs >= 1), ('first_macchiato', s.macchiato_logs >= 1), ('first_chai_latte', s.chai_logs >= 1),
    ('first_matcha', s.matcha_logs >= 1), ('first_tea', s.tea_logs >= 1), ('passport_sampler', s.unique_drinks >= 5),
    ('switch_hitter', s.coffee_logs >= 1 and s.tea_logs >= 1), ('hot_and_cold', s.hot_logs >= 1 and s.iced_logs >= 1),
    ('regular_behavior', s.max_shop_visits >= 5), ('they_know_your_order', s.max_shop_visits >= 10),
    ('first_photo', s.photo_logs >= 1), ('photo_10', s.photo_logs >= 10), ('first_caption', s.caption_logs >= 1),
    ('perfect_score', s.five_star_logs >= 1), ('state_lines', s.unique_states >= 2)
  ) as rule(achievement_key, qualifies)
  where rule.qualifies
)
insert into public.passport_achievements (user_id, achievement_key)
select user_id, achievement_key from qualifying
on conflict (user_id, achievement_key) do nothing;
