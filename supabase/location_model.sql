-- Coffee Passport: canonical location model.
--
-- THE ACTUAL BUG THIS FIXES: get_public_user_map (public_profile_v2.sql)
-- requires shops.latitude/longitude to be non-null. get_public_user_cities
-- has no such requirement — it groups by shops.city/state directly. A
-- shop can have a real city/state and still have null coordinates,
-- because createCoffeePassportShop (lib/shops/actions.ts) has NEVER
-- persisted latitude/longitude for any Coffee-Passport-created shop —
-- that's a deliberate, already-documented decision (see that file's own
-- comment), not an oversight: Google's exact place coordinates were
-- never given a clear permitted long-term persistence basis, so they
-- were never cached into shops at all. The result: "Cities: 3" and
-- "Map: 0" are computed from two different requirements on the exact
-- same underlying data, which is exactly the reported symptom.
--
-- THE FIX IS NOT "start persisting Google's coordinates" — that would
-- casually undo a deliberate policy decision. The fix is a SEPARATE
-- canonical location table, keyed at CITY level (not exact café level),
-- populated from a source that is NOT Google: city-level coordinates
-- ("Rome is at approximately 41.9°N, 12.5°E") are ordinary, widely
-- published, non-proprietary geographic facts, categorically different
-- from Google's exact place-level geocoding. shops keeps its own
-- city/state/country/lat/lng columns completely untouched — this is
-- purely additive. A shop that resolves to a canonical location gets
-- location_id set; the profile map reads coordinates from THAT
-- location, never from the shop's own (still-usually-null) lat/lng.
--
-- RUN ORDER: run this file first, before location_seed.sql,
-- location_backfill.sql, and profile_map_v2.sql.

-- CANONICAL IDENTITY SCHEME (re-designed this pass, before any
-- production deployment — see the correction note below for why).
--
-- region: for US locations, the same 2-letter USPS state/territory
-- code shops.state already stores everywhere else in this project
-- (e.g. "PA", not "Pennsylvania") — chosen specifically so a legacy
-- shop's own shops.state matches directly, with zero format
-- translation, in location_backfill.sql. For every other country,
-- region is left NULL. That's a deliberate, disclosed limitation, not
-- an oversight: GeoNames does provide admin1 codes for non-US
-- countries too (e.g. Italian regions), but this sandbox has no
-- network access to actually query GeoNames and verify what those
-- codes are — shipping a GUESSED code here would silently recreate
-- the exact duplicate-row bug this whole redesign exists to fix, just
-- for a different country. City + country_code alone is a safe,
-- unambiguous identity for now; a verified non-US region-code
-- convention is a clearly scoped future improvement once real
-- GeoNames access is available (see scripts/import-geonames-locations.mjs).
--
-- country: the normalized FULL display name ("Italy", "United
-- States"), for human-readable rendering.
-- country_code: the ISO-2 code ("IT", "US") — NOT NULL, because it's
-- what the canonical identity is actually anchored to below, not the
-- display name. Two different display-name spellings/variants for the
-- same country (a real risk with free text) can never split a
-- location into two canonical rows, because the KEY never looks at
-- `country`, only `country_code`.
--
-- normalized_key: city + region-code-or-empty + country_code. Uses
-- country_code specifically (not the country display name) per this
-- correction — a code is a stable, small, unambiguous identity;
-- display-name text is not (a data source calling the same country
-- "USA" vs "United States" would otherwise silently create two
-- canonical rows for every city in it).
-- CANONICAL IDENTITY SCHEME, corrected AGAIN this pass — see the note
-- below for exactly what changed and why.
--
-- region: for US locations, the same 2-letter USPS state/territory
-- code shops.state already stores everywhere else in this project
-- (e.g. "PA", not "Pennsylvania"). For every other country, region is
-- NULL — a deliberate, disclosed limitation (no verified non-US
-- region-code convention yet, see scripts/import-geonames-locations.mjs).
--
-- country: the normalized FULL display name ("Italy", "United States").
-- country_code: the ISO-2 code ("IT", "US"), NOT NULL.
--
-- geonames_id: THE actual global uniqueness anchor for any row
-- imported from GeoNames — GeoNames' own geonameid, unique by
-- construction across the entire planet. NULL for hand-seeded rows
-- (location_seed.sql), which have no GeoNames origin.
--
-- normalized_key: city + region-code-or-empty + country_code, exactly
-- as before — but it is now a MATCHING/LOOKUP aid, not a blanket
-- global uniqueness guarantee. Two genuinely different real places can
-- legitimately share the same display identity (two towns named the
-- same thing in the same US state, rare but real) — forcing global
-- uniqueness on display text alone would silently merge them into one
-- wrong row, exactly what this correction fixes. Uniqueness is now
-- enforced in two narrower, safer places instead (see the indexes
-- below): globally by geonames_id when present, and only among
-- hand-seeded rows (which this project fully curates and controls) by
-- normalized_key.
create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  region text,
  country text not null,
  country_code text not null,
  latitude numeric not null,
  longitude numeric not null,
  geonames_id bigint,
  normalized_key text generated always as (
    lower(trim(city)) || '|' || coalesce(upper(trim(region)), '') || '|' || upper(trim(country_code))
  ) stored,
  created_at timestamptz not null default now()
);

alter table public.locations enable row level security;

drop policy if exists "Authenticated users can view locations" on public.locations;
create policy "Authenticated users can view locations"
  on public.locations for select
  to authenticated
  using (true);

-- No client insert/update/delete policy: locations are seeded and
-- maintained by migrations/admin process only (see location_seed.sql
-- and location_backfill.sql), the same "no direct client mutation"
-- convention already used for shops' own provenance fields elsewhere
-- in this project.
revoke insert, update, delete on public.locations from authenticated;
revoke insert, update, delete on public.locations from anon;

-- Global uniqueness for any GeoNames-imported row — the actual fix for
-- "same-name cities silently collapsed into one row" (see
-- scripts/import-geonames-locations.mjs, which no longer does its own
-- JS-side normalized_key deduplication at all, relying entirely on
-- this instead).
--
-- A PLAIN (non-partial) unique index, not `WHERE geonames_id IS NOT
-- NULL` — Postgres unique indexes already permit any number of NULLs
-- by default (NULL is never considered equal to NULL for uniqueness
-- purposes), so the partial predicate bought nothing functionally and
-- broke something real: Supabase/PostgREST's `.upsert(..., {
-- onConflict: "geonames_id" })` cannot reliably infer a PARTIAL index
-- as its conflict target without also being told that index's WHERE
-- clause, which the importer's upsert call has no way to supply. A
-- plain unique index is what `onConflict: "geonames_id"` actually
-- needs to work.
drop index if exists public.locations_geonames_id_idx;
create unique index if not exists locations_geonames_id_idx
  on public.locations (geonames_id);

-- Uniqueness scoped to hand-seeded rows only (geonames_id is null) —
-- what location_seed.sql's own ON CONFLICT target uses. This project
-- fully curates that short list, so display-identity uniqueness is
-- safe to enforce there specifically, without extending the same
-- assumption to the entire imported GeoNames dataset.
create unique index if not exists locations_normalized_key_seed_idx
  on public.locations (normalized_key) where geonames_id is null;

-- Plain (non-unique) index across ALL rows, seeded and imported alike
-- — used for matching/lookup (location_backfill.sql,
-- matchLocationFromHint), where finding every candidate with a given
-- display identity is exactly the point, including the rare case where
-- more than one genuinely exists.
--
-- Defensive DROP first: an earlier draft of this file created a
-- UNIQUE index under this exact name. "IF NOT EXISTS" alone would skip
-- recreating it under the old (incompatible, now-wrong) definition if
-- that earlier draft was ever actually applied anywhere — dropping by
-- name first guarantees the index that exists afterward is always
-- this file's current, correct, non-unique definition.
drop index if exists public.locations_normalized_key_idx;
create index if not exists locations_normalized_key_idx on public.locations (normalized_key);

-- Re-run safety: ALTER TABLE ... ADD CONSTRAINT has no IF NOT EXISTS
-- form in Postgres, so a second run of a plain `add constraint` fails
-- on the already-existing name. This DO block checks pg_constraint by
-- name first, the same safe idempotent pattern already used elsewhere
-- in this project for named constraints (e.g. the notifications dedup
-- indexes' own guarded creation).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'locations_latitude_range'
  ) then
    alter table public.locations
      add constraint locations_latitude_range check (latitude >= -90 and latitude <= 90);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'locations_longitude_range'
  ) then
    alter table public.locations
      add constraint locations_longitude_range check (longitude >= -180 and longitude <= 180);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'locations_country_code_format'
  ) then
    alter table public.locations
      add constraint locations_country_code_format check (country_code ~ '^[A-Z]{2}$');
  end if;
end $$;

-- ---------------------------------------------------------------------
-- shops.location_id: additive only. Existing city/state/country/
-- latitude/longitude columns on shops are completely untouched, not
-- deprecated, not backfilled away from — Explore and any other surface
-- that legitimately reads a shop's own fields keeps working exactly as
-- before. This is a new, optional, purely additive relationship used
-- specifically by the Passport/profile map.
-- ---------------------------------------------------------------------
alter table public.shops
  add column if not exists location_id uuid references public.locations(id) on delete set null;

create index if not exists shops_location_id_idx on public.shops (location_id);
