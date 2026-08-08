-- Coffee Passport: development shop data for Sprint 3A.
-- Run after drink_logging_schema.sql. Safe to run more than once, the
-- "where not exists" clause skips any shop that's already there by
-- name and city, rather than relying on a unique constraint that
-- doesn't otherwise need to exist on this table.
--
-- These are fictional, clearly development-oriented cafés. Google
-- Places will replace this as the real data source in a later sprint.

insert into public.shops (name, address, city, state, is_chain)
select v.name, v.address, v.city, v.state, v.is_chain
from (
  values
    ('Fern & Bloom', '412 Rainey St', 'Austin', 'TX', false),
    ('North End Coffee', '1801 E 6th St', 'Austin', 'TX', false),
    ('The Marble Bar', '900 Congress Ave', 'Austin', 'TX', false),
    ('Nine Bar Coffee', '2222 Guadalupe St', 'Austin', 'TX', false),
    ('The Reading Room', '3005 S Lamar Blvd', 'Austin', 'TX', false),
    ('Willow & Co.', '1205 E 11th St', 'Austin', 'TX', false),
    ('Cardinal Coffee Co.', '4141 Guadalupe St', 'Austin', 'TX', false),
    ('Northside Roasters', '5555 Burnet Rd', 'Austin', 'TX', false),
    ('Blue Heron Coffee', '88 S Congress Ave', 'Austin', 'TX', false),
    ('Third Wave Collective', '77 Rainey St', 'Austin', 'TX', false)
) as v(name, address, city, state, is_chain)
where not exists (
  select 1 from public.shops s where s.name = v.name and s.city = v.city
);
