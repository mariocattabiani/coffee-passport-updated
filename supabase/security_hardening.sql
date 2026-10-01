-- Coffee Passport database privilege hardening.
--
-- Client roles only need normal CRUD privileges on application tables.
-- Remove database-administration privileges that browser/mobile users
-- should never need.
--
-- Run after application tables have been created.

revoke truncate, trigger, references
on all tables in schema public
from anon, authenticated;

revoke maintain
on all tables in schema public
from anon, authenticated;

-- Prevent future tables created by postgres from automatically granting
-- these unnecessary privileges back to client roles.

alter default privileges
for role postgres
in schema public
revoke truncate, trigger, references
on tables
from anon, authenticated;

alter default privileges
for role postgres
in schema public
revoke maintain
on tables
from anon, authenticated;
