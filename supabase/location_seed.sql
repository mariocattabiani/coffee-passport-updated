-- Coffee Passport: locations starter seed.
--
-- CANONICAL CONVENTION (must match scripts/import-geonames-locations.mjs
-- exactly, see location_model.sql for the full scheme): region is the
-- 2-letter USPS code for US rows, NULL for every other country;
-- country is the full display name; country_code is the ISO-2 code,
-- uppercase.
--
-- HONEST SCOPE: this is a starter set of ~30 well-known cities,
-- including every city named in the bug report's test cases (Rome,
-- Virginia Beach, Harrisburg, Hoboken, New York City, East Windsor,
-- Cles), plus common US/international cities likely to appear in real
-- usage. It is NOT a comprehensive world-cities dataset. Coordinates
-- below are real, published city-center figures (ordinary geographic
-- facts, not Google-derived place data), accurate to roughly
-- city-center precision, which is all a travel/exploration map needs.
--
-- FOR PRODUCTION-SCALE COVERAGE: run scripts/import-geonames-locations.mjs
-- (GeoNames, CC BY 4.0, not Google-derived) locally, wherever real
-- network access exists — it could not be run in the sandbox that
-- built this feature.
--
-- RUN ORDER: after location_model.sql, before location_backfill.sql.
-- Also safe to run AFTER the GeoNames importer, and any number of
-- times after that — see the NOT EXISTS pattern below for why.
--
-- RERUN SAFETY, corrected: this file previously used
-- `ON CONFLICT (normalized_key) WHERE geonames_id IS NULL DO NOTHING`,
-- relying on the partial unique index scoped to un-attached seed rows.
-- That breaks the moment the GeoNames importer attaches a geonames_id
-- to one of these rows: the row then falls OUTSIDE that partial
-- index's scope, so a later re-run of this file would no longer see
-- it as a conflict and would insert a second Harrisburg. This version
-- instead checks NOT EXISTS against the full locations table —
-- regardless of whether a matching row has a geonames_id or not — the
-- same INSERT ... SELECT ... WHERE NOT EXISTS pattern this project
-- already uses in supabase/seed_shops.sql. A seed row is only ever
-- inserted when truly nothing with the same normalized identity exists
-- yet, at any point in this file's lifetime relative to the importer.

insert into public.locations (city, region, country, country_code, latitude, longitude)
select v.city, v.region, v.country, v.country_code, v.latitude, v.longitude
from (
  values
    -- Test-case cities from the bug report
    ('Harrisburg', 'PA', 'United States', 'US', 40.2732, -76.8867),
    ('Virginia Beach', 'VA', 'United States', 'US', 36.8529, -75.9780),
    ('Hoboken', 'NJ', 'United States', 'US', 40.7439, -74.0324),
    ('New York City', 'NY', 'United States', 'US', 40.7128, -74.0060),
    ('East Windsor', 'NJ', 'United States', 'US', 40.2843, -74.5321),
    -- Italy: region intentionally NULL, not a guessed GeoNames admin1
    -- code — see location_model.sql's canonical-scheme note for why.
    ('Rome', null, 'Italy', 'IT', 41.9028, 12.4964),
    ('Cles', null, 'Italy', 'IT', 46.3667, 11.0333),

    -- Common Pennsylvania / nearby cities (Coffee Passport's core early usage area)
    ('Philadelphia', 'PA', 'United States', 'US', 39.9526, -75.1652),
    ('Pittsburgh', 'PA', 'United States', 'US', 40.4406, -79.9959),
    ('Lancaster', 'PA', 'United States', 'US', 40.0379, -76.3055),
    ('Mechanicsburg', 'PA', 'United States', 'US', 40.2131, -77.0072),
    ('Mount Joy', 'PA', 'United States', 'US', 40.1120, -76.5061),

    -- Other common US cities
    ('Los Angeles', 'CA', 'United States', 'US', 34.0522, -118.2437),
    ('San Francisco', 'CA', 'United States', 'US', 37.7749, -122.4194),
    ('Chicago', 'IL', 'United States', 'US', 41.8781, -87.6298),
    ('Boston', 'MA', 'United States', 'US', 42.3601, -71.0589),
    ('Seattle', 'WA', 'United States', 'US', 47.6062, -122.3321),
    ('Austin', 'TX', 'United States', 'US', 30.2672, -97.7431),
    ('Denver', 'CO', 'United States', 'US', 39.7392, -104.9903),
    ('Miami', 'FL', 'United States', 'US', 25.7617, -80.1918),
    ('Washington', 'DC', 'United States', 'US', 38.9072, -77.0369),

    -- Common international cities — region NULL throughout, same reason as Italy above
    ('Paris', null, 'France', 'FR', 48.8566, 2.3522),
    ('London', null, 'United Kingdom', 'GB', 51.5074, -0.1278),
    ('Milan', null, 'Italy', 'IT', 45.4642, 9.1900),
    ('Florence', null, 'Italy', 'IT', 43.7696, 11.2558),
    ('Naples', null, 'Italy', 'IT', 40.8518, 14.2681),
    ('Barcelona', null, 'Spain', 'ES', 41.3851, 2.1734),
    ('Berlin', null, 'Germany', 'DE', 52.5200, 13.4050),
    ('Tokyo', null, 'Japan', 'JP', 35.6762, 139.6503),
    ('Toronto', null, 'Canada', 'CA', 43.6532, -79.3832),
    ('Sydney', null, 'Australia', 'AU', -33.8688, 151.2093)
) as v(city, region, country, country_code, latitude, longitude)
where not exists (
  select 1 from public.locations l
  where lower(trim(l.city)) = lower(trim(v.city))
    and coalesce(upper(trim(l.region)), '') = coalesce(upper(trim(v.region)), '')
    and upper(trim(l.country_code)) = upper(trim(v.country_code))
);
