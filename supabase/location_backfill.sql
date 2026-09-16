-- Coffee Passport: location backfill.
--
-- Deterministic and auditable — no fuzzy/phonetic matching anywhere in
-- this file. A shop only ever gets matched by an EXACT field-by-field
-- match against public.locations. If that match can't be made safely,
-- the shop's location_id is simply left null (it already defaults to
-- null, nothing destructive happens) and it shows up in the
-- "unresolved" report below for follow-up — never guessed.
--
-- Matches compare fields directly (city/region/country) rather than
-- reconstructing locations.normalized_key's generated-column formula
-- as a string — field-by-field comparison can't silently drift out of
-- sync with that formula the way a hand-copied concatenation could.
--
-- RUN ORDER: after location_model.sql and location_seed.sql. Safe to
-- re-run: every UPDATE only touches rows currently matching its WHERE
-- clause (location_id is null) and only ever sets location_id,
-- existing city/state/country/latitude/longitude on shops are never
-- read from, written to, or cleared by this file.

-- ---------------------------------------------------------------------
-- Pass 1: shops with city + country present, matched against a
-- location with the exact same city/country TEXT — and state/region
-- compared CONDITIONALLY, not required to simply exist. The previous
-- version of this pass required s.state IS NOT NULL unconditionally,
-- which broke exactly the case this whole correction targets: a
-- legitimate existing international shop like city=Cles, state=null,
-- country=Italy could never match its own canonical Cles/region=null/
-- Italy location, because region being null on BOTH sides was treated
-- as "doesn't have a state" rather than "correctly has no region,
-- matching the canonical row's own no-region convention for non-US
-- countries" (see location_model.sql). Now: when the canonical
-- location's region IS null, the shop's state must ALSO be null (both
-- sides agreeing "no region" is what makes non-US matching possible at
-- all); when the canonical region IS NOT null (a US row), the shop's
-- state must match it exactly, same as before.
-- ---------------------------------------------------------------------
update public.shops s
set location_id = l.id
from public.locations l
where s.location_id is null
  and s.city is not null
  and s.country is not null
  and lower(trim(s.city)) = lower(trim(l.city))
  and lower(trim(s.country)) = lower(trim(l.country))
  and (
    (l.region is null and s.state is null)
    or (l.region is not null and s.state is not null and upper(trim(s.state)) = l.region)
  );

-- ---------------------------------------------------------------------
-- Pass 2: shops with city + state present but country NULL, where
-- state is a standard two-letter USPS state/territory code. This
-- project has been US-only for most of its history, and shops.state
-- has always been populated as a 2-letter USPS code (confirmed by
-- inspection, not assumed) — decoding an already-structured code into
-- its one corresponding country is a deterministic lookup, not a fuzzy
-- guess, the same category of safe inference as reading a country code
-- out of a phone number's area code. A state code that is NOT in this
-- list is left completely alone; it falls through to the unresolved
-- report below rather than being guessed at. locations.region for US
-- rows is already the same 2-letter code convention (see
-- location_model.sql), so this compares directly with no format
-- translation needed.
-- ---------------------------------------------------------------------
with us_states(code) as (
  values
    ('AL'),('AK'),('AZ'),('AR'),('CA'),('CO'),('CT'),('DE'),('FL'),('GA'),
    ('HI'),('ID'),('IL'),('IN'),('IA'),('KS'),('KY'),('LA'),('ME'),('MD'),
    ('MA'),('MI'),('MN'),('MS'),('MO'),('MT'),('NE'),('NV'),('NH'),('NJ'),
    ('NM'),('NY'),('NC'),('ND'),('OH'),('OK'),('OR'),('PA'),('RI'),('SC'),
    ('SD'),('TN'),('TX'),('UT'),('VT'),('VA'),('WA'),('WV'),('WI'),('WY'),
    ('DC')
)
update public.shops s
set location_id = l.id
from public.locations l, us_states us
where s.location_id is null
  and s.city is not null
  and s.state is not null
  and s.country is null
  and upper(trim(s.state)) = us.code
  and lower(trim(s.city)) = lower(trim(l.city))
  and upper(trim(s.state)) = l.region
  and l.country_code = 'US';

-- ---------------------------------------------------------------------
-- Non-US legacy shops: intentionally NOT auto-matched by city alone —
-- a bare city name with no state/country is exactly the ambiguous case
-- ("which Springfield?", or here, "which Rome?" in principle) this
-- whole feature refuses to guess at. These rows simply stay
-- unresolved and appear in the report below; resolving them requires
-- either shops.country actually being populated (rare today) or a
-- manual/admin review pass, not an automatic pattern-match.
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- Backfill report. Read-only, admin/migration output only — no user-
-- identifying data, just counts, run this block after the two UPDATEs
-- above to see the result.
-- ---------------------------------------------------------------------
select
  count(*) as shops_scanned,
  count(*) filter (where location_id is not null) as shops_matched,
  count(*) filter (where location_id is null and city is not null) as shops_unresolved_with_city,
  count(*) filter (where city is null) as shops_missing_city,
  count(*) filter (where latitude is not null and longitude is not null) as shops_with_own_coordinates,
  (select count(distinct location_id) from public.shops where location_id is not null) as distinct_locations_used
from public.shops;

-- Optional follow-up: the specific unresolved (city present, no match)
-- rows, for manual review — e.g. a city/state combination not yet in
-- locations, or a non-US shop with country still null. Never run this
-- as anything but an admin/migration-time query.
select id, name, city, state, country
from public.shops
where location_id is null and city is not null
order by city;

-- ---------------------------------------------------------------------
-- Legacy international candidates, specifically: unresolved shops with
-- a city but no country, whose state (if any) is NOT a recognized US
-- code — i.e., not already covered by Pass 2's deterministic US
-- inference, and therefore never auto-matchable by this file at all
-- (matching by city name alone, with no country, is exactly the
-- ambiguous case this feature refuses to guess at). This is the
-- specific worklist for a manual/admin resolution pass — e.g. the
-- owner's own Italy shops from the reported bug — never for automated
-- matching. No guessing happens here, this is a report only.
-- ---------------------------------------------------------------------
with us_states(code) as (
  values
    ('AL'),('AK'),('AZ'),('AR'),('CA'),('CO'),('CT'),('DE'),('FL'),('GA'),
    ('HI'),('ID'),('IL'),('IN'),('IA'),('KS'),('KY'),('LA'),('ME'),('MD'),
    ('MA'),('MI'),('MN'),('MS'),('MO'),('MT'),('NE'),('NV'),('NH'),('NJ'),
    ('NM'),('NY'),('NC'),('ND'),('OH'),('OK'),('OR'),('PA'),('RI'),('SC'),
    ('SD'),('TN'),('TX'),('UT'),('VT'),('VA'),('WA'),('WV'),('WI'),('WY'),
    ('DC')
)
select s.id, s.name, s.city, s.state, s.country
from public.shops s
where s.location_id is null
  and s.city is not null
  and s.country is null
  and (s.state is null or upper(trim(s.state)) not in (select code from us_states))
order by s.city;
