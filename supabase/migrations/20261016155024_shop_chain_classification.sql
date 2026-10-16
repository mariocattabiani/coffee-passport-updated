-- Coffee Passport
-- Make café chain classification tri-state:
--   true  = confirmed chain
--   false = confirmed independent
--   null  = not yet classified
--
-- Google-backed shops previously inherited DEFAULT false, which caused
-- unknown cafés such as Starbucks/Dunkin to be mislabeled independent.

alter table public.shops
  alter column is_chain drop not null;

alter table public.shops
  alter column is_chain drop default;

-- Existing Google-created shops never supplied is_chain, so false on those
-- rows generally means "defaulted", not "confirmed independent".
update public.shops
set is_chain = null
where google_place_id is not null
  and is_chain = false;

-- Recognize common chains conservatively by canonical café name.
-- Unknown names stay NULL rather than being guessed independent.
create or replace function public.infer_shop_is_chain(target_name text)
returns boolean
language sql
immutable
as $$
  select case
    when target_name is null then null

    when lower(trim(target_name)) ~
      '^(starbucks|dunkin(''|’)?|panera bread|mcdonald(''|’)?s|tim hortons|peet(''|’)?s coffee|caribou coffee|dutch bros( coffee)?|scooter(''|’)?s coffee|the coffee bean & tea leaf|coffee bean & tea leaf|gloria jean(''|’)?s|biggby coffee|7 brew( coffee)?|pj(''|’)?s coffee|aroma joe(''|’)?s)( |$)'
      then true

    else null
  end;
$$;

-- Repair known chains already stored.
update public.shops
set is_chain = public.infer_shop_is_chain(name)
where google_place_id is not null
  and public.infer_shop_is_chain(name) is true;

-- Automatically classify recognizable chains when a new Google-backed
-- shop is created. Unknown cafés remain NULL.
create or replace function public.apply_shop_chain_classification()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.google_place_id is not null
     and new.is_chain is null then
    new.is_chain := public.infer_shop_is_chain(new.name);
  end if;

  return new;
end;
$$;

drop trigger if exists apply_shop_chain_classification
on public.shops;

create trigger apply_shop_chain_classification
before insert or update of name, google_place_id, is_chain
on public.shops
for each row
execute function public.apply_shop_chain_classification();

comment on column public.shops.is_chain is
  'Tri-state café classification: true=confirmed chain, false=confirmed independent, null=unclassified.';
