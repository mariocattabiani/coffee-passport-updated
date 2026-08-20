-- Coffee Passport: Sprint 3F.5, country on shops.
-- Run once in the SQL Editor. Additive only, does not touch or rerun
-- any earlier migration.
--
-- Nullable, no backfill of existing rows. Existing shops (seed data
-- and every café added before this migration) simply keep
-- country = null, that is expected and every Passport V1 feature must
-- tolerate it, this is not a "temporarily broken until we fix it"
-- state. New shops created after this migration ships will have
-- country populated from Google's addressComponents, already fetched
-- in the existing findOrCreateShop flow, no new Google API call.

alter table public.shops add column country text;

alter table public.shops
  add constraint shops_country_length
  check (country is null or length(country) <= 80);
