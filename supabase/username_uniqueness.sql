-- Coffee Passport: case-insensitive username uniqueness.
-- Run this once in the Supabase SQL Editor, after schema.sql and
-- username_check.sql have already been run.
--
-- What this does and why: the profiles table currently has a plain
-- `unique` constraint on the username column, which Postgres enforces
-- case-sensitively. That means "mario" and "Mario" could both exist as
-- separate rows even though the app treats them as the same username.
-- This migration does not touch the table structure or any existing
-- data, it only changes how uniqueness is enforced, and it does so in
-- a safe order: check first, build the new safeguard, and only remove
-- the old one after the new one is confirmed in place.

-- Step 1: check for any existing usernames that only differ by case.
-- If any are found, stop here with a clear error and make no changes
-- at all, so you can resolve them by hand before rerunning this file.
do $$
declare
  duplicate_count int;
begin
  select count(*) into duplicate_count
  from (
    select lower(username)
    from public.profiles
    where username is not null
    group by lower(username)
    having count(*) > 1
  ) as duplicates;

  if duplicate_count > 0 then
    raise exception
      'Found % username(s) that only differ by capitalization. Resolve these manually (rename one of each pair) before rerunning this migration.',
      duplicate_count;
  end if;
end $$;

-- Step 2: create the case-insensitive unique index. The "where username
-- is not null" part is what allows any number of users to still have no
-- username at all (before they finish onboarding).
create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username))
  where username is not null;

-- Step 3: only now that the new, case-insensitive safeguard exists and
-- is confirmed working, remove the old case-sensitive constraint. (This
-- is the constraint Postgres created automatically for
-- `username text unique` in schema.sql. Its default name is
-- "profiles_username_key" unless it was renamed.)
alter table public.profiles
  drop constraint if exists profiles_username_key;
