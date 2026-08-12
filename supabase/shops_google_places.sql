-- Coffee Passport: Sprint 3C, Google Places-backed shop creation.
-- Run once in the SQL Editor. Additive only, does not touch or rerun
-- drink_logging_schema.sql.
--
-- Honest note on trust: this is a browser-key-only architecture (see
-- the approved Sprint 3C plan). The server accepts browser-submitted
-- Google place metadata (name, address, coordinates) as pragmatic
-- early-stage input, it is not independently re-verified against
-- Google server-side. This policy, combined with the existing unique
-- constraint on google_place_id, cannot prove the metadata is
-- authentic, it only guarantees that whatever is stored is backed by
-- some non-null place id and can never silently duplicate a place that
-- already exists. Real server-side verification (a second, differently
-- restricted Google key) is a deliberate future decision, not an
-- oversight.

-- Authenticated users may create a shop record, but only when it
-- carries a real Google place id, this is what lets a person's Places
-- selection persist as a canonical, shared shop row without opening the
-- door back up to arbitrary fake shop creation.
create policy "Authenticated users can add Google-backed shops"
  on public.shops for insert
  to authenticated
  with check (google_place_id is not null);

-- Deliberately no update or delete policy, matching the existing
-- drinks precedent: shared data, insert-only, immutable once created.
-- All canonical shop creation happens through the app's
-- findOrCreateShop server action, never a direct client insert.

-- Coordinate sanity bounds. The column type (numeric) doesn't
-- constrain the range on its own, the existing google_place_id unique
-- constraint is sufficient on its own and is not duplicated here.
alter table public.shops
  add constraint shops_latitude_range
  check (latitude is null or (latitude >= -90 and latitude <= 90));

alter table public.shops
  add constraint shops_longitude_range
  check (longitude is null or (longitude >= -180 and longitude <= 180));

-- Basic structural defense matching the server action's own validation
-- rules, so the same limits hold even if a request somehow bypassed
-- findOrCreateShop. This is not Google verification, it's just sane
-- bounds on what a row is allowed to contain: non-blank where it
-- matters, and reasonable maximum lengths. The existing unique
-- constraint on google_place_id already handles duplicate prevention,
-- nothing here duplicates that.
alter table public.shops
  add constraint shops_google_place_id_shape
  check (
    google_place_id is null
    or (length(trim(google_place_id)) > 0 and length(google_place_id) <= 255)
  );

alter table public.shops
  add constraint shops_name_shape
  check (length(trim(name)) > 0 and length(name) <= 120);

alter table public.shops
  add constraint shops_address_length
  check (address is null or length(address) <= 255);

alter table public.shops
  add constraint shops_city_length
  check (city is null or length(city) <= 80);

alter table public.shops
  add constraint shops_state_length
  check (state is null or length(state) <= 80);
