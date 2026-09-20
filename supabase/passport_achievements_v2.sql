-- Coffee Passport: richer stamp catalog and account-scoped NEW state.
-- Run after passport_achievements.sql and passport_achievement_rpc.sql.
-- Rerun-safe: stable achievement keys plus the existing unique
-- (user_id, achievement_key) constraint prevent duplicate awards.

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'passport_achievements'
      and column_name = 'seen_at'
  ) then
    alter table public.passport_achievements add column seen_at timestamptz;

    -- Existing V1 stamps predate collection seen-state. Treat them as
    -- already seen so only stamps awarded by this release show NEW.
    update public.passport_achievements set seen_at = now();
  end if;
end $$;

create or replace function public.mark_passport_achievements_seen()
returns void
language sql
security definer
set search_path = public
as $$
  update public.passport_achievements
  set seen_at = now()
  where user_id = auth.uid()
    and seen_at is null;
$$;

revoke all on function public.mark_passport_achievements_seen() from public;
revoke all on function public.mark_passport_achievements_seen() from anon;
grant execute on function public.mark_passport_achievements_seen() to authenticated;

create or replace function public.evaluate_passport_achievements()
returns table (newly_awarded_key text)
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Not authenticated';
  end if;

  return query
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
    where dl.user_id = me
  ),
  shop_counts as (
    select shop_id, count(*)::integer as visits
    from log_rows
    group by shop_id
  ),
  stats as (
    select
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
      coalesce((select max(visits) from shop_counts), 0)::integer as max_shop_visits
    from log_rows
  ),
  qualifying as (
    select rule.achievement_key
    from stats s
    cross join lateral (values
      ('first_sip', s.total_logs >= 1),
      ('coffee_25', s.coffee_logs >= 25),
      ('coffee_100', s.coffee_logs >= 100),
      ('shop_explorer_5', s.unique_shops >= 5),
      ('shop_explorer_10', s.unique_shops >= 10),
      ('city_explorer_5', s.unique_cities >= 5),
      ('tea_curious', s.tea_logs >= 5),
      ('first_latte', s.latte_logs >= 1),
      ('first_cappuccino', s.cappuccino_logs >= 1),
      ('first_flat_white', s.flat_white_logs >= 1),
      ('first_cortado', s.cortado_logs >= 1),
      ('first_espresso', s.espresso_logs >= 1),
      ('first_americano', s.americano_logs >= 1),
      ('first_drip_coffee', s.drip_logs >= 1),
      ('first_cold_brew', s.cold_brew_logs >= 1),
      ('first_mocha', s.mocha_logs >= 1),
      ('first_macchiato', s.macchiato_logs >= 1),
      ('first_chai_latte', s.chai_logs >= 1),
      ('first_matcha', s.matcha_logs >= 1),
      ('first_tea', s.tea_logs >= 1),
      ('passport_sampler', s.unique_drinks >= 5),
      ('switch_hitter', s.coffee_logs >= 1 and s.tea_logs >= 1),
      ('hot_and_cold', s.hot_logs >= 1 and s.iced_logs >= 1),
      ('regular_behavior', s.max_shop_visits >= 5),
      ('they_know_your_order', s.max_shop_visits >= 10),
      ('first_photo', s.photo_logs >= 1),
      ('photo_10', s.photo_logs >= 10),
      ('first_caption', s.caption_logs >= 1),
      ('perfect_score', s.five_star_logs >= 1),
      ('state_lines', s.unique_states >= 2)
    ) as rule(achievement_key, qualifies)
    where rule.qualifies
  ),
  inserted as (
    insert into public.passport_achievements (user_id, achievement_key)
    select me, achievement_key from qualifying
    on conflict (user_id, achievement_key) do nothing
    returning achievement_key
  )
  select inserted.achievement_key from inserted;
end;
$$;

revoke all on function public.evaluate_passport_achievements() from public;
revoke all on function public.evaluate_passport_achievements() from anon;
grant execute on function public.evaluate_passport_achievements() to authenticated;

-- Retroactive V2 award pass for every existing user. The original
-- seven stable keys are included and remain untouched on conflict.
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
