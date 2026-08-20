-- Coffee Passport: Sprint 3F.5, achievement evaluation.
-- Run once in the SQL Editor, after passport_achievements.sql.
-- Additive only.
--
-- Deliberately NOT a generic award_achievement(key) that trusts the
-- caller. This function determines qualification itself, entirely
-- server-side, from the authenticated user's own drink_logs, a caller
-- has no way to self-award something they don't actually qualify for.
-- The seven V1 rules live here explicitly, application code owns
-- names/descriptions/categories/visual treatment/progress display,
-- this small duplication of the qualification thresholds is a
-- deliberate integrity tradeoff, not an oversight.
--
-- Race/duplicate safety comes from the unique(user_id, achievement_key)
-- constraint itself: every insert here uses on conflict do nothing,
-- and plpgsql's FOUND correctly reflects whether a row actually
-- inserted (true) or was skipped by the conflict (false), that's how
-- the "newly awarded" list is built without a separate existence check.
create or replace function public.evaluate_passport_achievements()
returns table (newly_awarded_key text)
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  total_logs integer;
  coffee_logs integer;
  unique_shops integer;
  unique_cities integer;
  tea_logs integer;
  awarded text[] := '{}';
begin
  if me is null then
    raise exception 'Not authenticated';
  end if;

  select count(*) into total_logs
  from public.drink_logs
  where user_id = me;

  select count(*) into coffee_logs
  from public.drink_logs
  where user_id = me
    and beverage_category = 'coffee';

  select count(distinct dl.shop_id) into unique_shops
  from public.drink_logs dl
  where dl.user_id = me;

  select count(distinct (lower(trim(s.city)), lower(trim(s.state)))) into unique_cities
  from public.drink_logs dl
  join public.shops s on s.id = dl.shop_id
  where dl.user_id = me
    and s.city is not null
    and s.state is not null;

  select count(*) into tea_logs
  from public.drink_logs
  where user_id = me
    and beverage_category = 'tea';

  if total_logs >= 1 then
    insert into public.passport_achievements (user_id, achievement_key)
    values (me, 'first_sip')
    on conflict (user_id, achievement_key) do nothing;
    if found then awarded := array_append(awarded, 'first_sip'); end if;
  end if;

  if coffee_logs >= 25 then
    insert into public.passport_achievements (user_id, achievement_key)
    values (me, 'coffee_25')
    on conflict (user_id, achievement_key) do nothing;
    if found then awarded := array_append(awarded, 'coffee_25'); end if;
  end if;

  if coffee_logs >= 100 then
    insert into public.passport_achievements (user_id, achievement_key)
    values (me, 'coffee_100')
    on conflict (user_id, achievement_key) do nothing;
    if found then awarded := array_append(awarded, 'coffee_100'); end if;
  end if;

  if unique_shops >= 5 then
    insert into public.passport_achievements (user_id, achievement_key)
    values (me, 'shop_explorer_5')
    on conflict (user_id, achievement_key) do nothing;
    if found then awarded := array_append(awarded, 'shop_explorer_5'); end if;
  end if;

  if unique_shops >= 10 then
    insert into public.passport_achievements (user_id, achievement_key)
    values (me, 'shop_explorer_10')
    on conflict (user_id, achievement_key) do nothing;
    if found then awarded := array_append(awarded, 'shop_explorer_10'); end if;
  end if;

  if unique_cities >= 5 then
    insert into public.passport_achievements (user_id, achievement_key)
    values (me, 'city_explorer_5')
    on conflict (user_id, achievement_key) do nothing;
    if found then awarded := array_append(awarded, 'city_explorer_5'); end if;
  end if;

  if tea_logs >= 5 then
    insert into public.passport_achievements (user_id, achievement_key)
    values (me, 'tea_curious')
    on conflict (user_id, achievement_key) do nothing;
    if found then awarded := array_append(awarded, 'tea_curious'); end if;
  end if;

  return query select unnest(awarded);
end;
$$;

revoke all on function public.evaluate_passport_achievements() from public;
revoke all on function public.evaluate_passport_achievements() from anon;
grant execute on function public.evaluate_passport_achievements() to authenticated;
