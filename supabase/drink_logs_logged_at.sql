-- Coffee Passport: optional backdated coffee log date.
-- Additive only, does not touch or rerun drink_logging_schema.sql or
-- any earlier migration.
--
-- logged_at represents when the coffee/tea actually happened, as
-- reported by the user (defaults to the moment they log it, but can be
-- backdated up to and including today, in their own local timezone).
-- created_at continues to mean exactly what it always has, when this
-- database row was created, and is never changed by this migration or
-- by backdating a log.

alter table public.drink_logs
  add column logged_at timestamptz not null default now();

-- Every existing row's logged_at becomes its own created_at, the best
-- available approximation of "when it happened" for logs created
-- before this feature existed.
update public.drink_logs
  set logged_at = created_at;

-- Recent-activity and history queries now sort by logged_at first, this
-- matches that access pattern. The existing (user_id, created_at desc)
-- index is left in place, not replaced.
create index if not exists drink_logs_user_logged_idx
  on public.drink_logs (user_id, logged_at desc);
