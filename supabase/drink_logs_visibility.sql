-- Coffee Passport: Sprint 3E, public/private visibility for drink logs.
-- Run once in the SQL Editor. Additive only, does not touch or rerun
-- drink_logging_schema.sql or any earlier migration.
--
-- Sequencing matters here: the column is added with no default first,
-- every existing row is explicitly backfilled to 'private', and only
-- then does the default become 'public'. A default set before the
-- backfill, or applied at column-creation time, would risk existing
-- rows silently inheriting a public default they were never meant to
-- have. This order guarantees existing logs stay private and only
-- future inserts default public.

alter table public.drink_logs add column visibility text;

update public.drink_logs set visibility = 'private';

alter table public.drink_logs alter column visibility set default 'public';

alter table public.drink_logs alter column visibility set not null;

alter table public.drink_logs
  add constraint drink_logs_visibility_check check (visibility in ('public', 'private'));

-- Matches the public feed's own query shape exactly (filter + full
-- three-key order by), and stays small since it only ever indexes
-- public rows, private logs never enter this index at all.
create index if not exists drink_logs_public_feed_idx
  on public.drink_logs (logged_at desc, created_at desc, id desc)
  where visibility = 'public';
