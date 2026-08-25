-- Coffee Passport: minimal provenance metadata for shops.name/city,
-- so we stop losing track of where that data came from going forward.
-- Run once in the SQL Editor. Additive only.
--
-- This is deliberately NOT part of a Google-data caching/refresh
-- system, no fetched_at, no expiration, no scheduler. It exists only
-- to record whether a shop's name/city were entered by a Coffee
-- Passport user (the new, conservative creation flow) versus of
-- unknown origin (every row that predates this migration).
--
-- Existing rows are backfilled to the literal string 'unknown', never
-- 'google_places', we have no reliable evidence of provenance for
-- historical rows and are not fabricating it. 'unknown' is an honest,
-- true statement about what we don't know, not a guess dressed up as
-- a fact.

-- NOT NULL DEFAULT 'unknown' backfills every existing row to that
-- value atomically as part of adding the column, no separate UPDATE
-- is needed or meaningful after this.
alter table public.shops add column name_source text not null default 'unknown';
alter table public.shops add column location_source text not null default 'unknown';

alter table public.shops
  add constraint shops_name_source_check
  check (name_source in ('user', 'manual', 'seed', 'unknown'));

alter table public.shops
  add constraint shops_location_source_check
  check (location_source in ('user', 'manual', 'seed', 'unknown'));
