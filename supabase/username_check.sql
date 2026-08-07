-- Coffee Passport: username availability check.
-- Run this once in the Supabase SQL Editor (in addition to schema.sql,
-- which you should already have run).
--
-- Why this is needed: the profiles table's row-level security only lets a
-- user see their own row (see schema.sql). That's correct for privacy, but
-- it means the browser can't directly query "does this username exist"
-- for someone else's row. This function runs with elevated privileges
-- (security definer) and returns only a true/false answer, never the
-- underlying profile data, so it's safe to call from the client.

create or replace function public.is_username_taken(
  check_username text,
  exclude_id uuid default null
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where lower(username) = lower(check_username)
      and (exclude_id is null or id <> exclude_id)
  );
$$;

-- Only signed-in users can call this (matches "must be authenticated to
-- go through onboarding" already enforced by the app). We revoke from
-- public and anon explicitly first, rather than relying on the default
-- privileges, so the intent is unambiguous no matter what the project's
-- default grants happen to be.
revoke all on function public.is_username_taken(text, uuid) from public;
revoke all on function public.is_username_taken(text, uuid) from anon;
grant execute on function public.is_username_taken(text, uuid) to authenticated;
