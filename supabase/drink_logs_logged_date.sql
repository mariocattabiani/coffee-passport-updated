-- Coffee Passport: explicit calendar date for backdated logs.
-- Additive only, does not touch or rerun drink_logging_schema.sql or
-- drink_logs_logged_at.sql.
--
-- logged_at (already added) is the sortable timestamptz for when the
-- drink occurred, history/recent-activity ordering continues to use it
-- exactly as before. logged_date is new: the exact calendar date the
-- user picked when backdating, stored with no time component at all,
-- so it can never be ambiguous about which day it represents the way
-- slicing a UTC timestamp string can be. created_at remains row
-- creation time, untouched by any of this.
--
-- Existing rows are left with logged_date = null on purpose, we don't
-- have a reliable way to know what local calendar day a historical log
-- represented, and guessing from created_at would just reintroduce the
-- same kind of inaccuracy this column exists to avoid.

alter table public.drink_logs
  add column logged_date date;
