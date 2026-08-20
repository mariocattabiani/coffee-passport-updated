-- Coffee Passport: Sprint 3F.5, Passport V1 achievements table.
-- Run once in the SQL Editor. Additive only.
--
-- Insert-only from the app's perspective: no update or delete policy
-- exists, an earned achievement is a historical event and is never
-- revoked, even if the user later edits or deletes logs and current
-- data would no longer qualify. No ordinary live progress is stored
-- here at all, only achievements that have actually been earned,
-- current progress toward an unearned achievement is always
-- recalculated fresh from drink_logs.

create table public.passport_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_key text not null,
  earned_at timestamptz not null default now(),
  metadata jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, achievement_key)
);

alter table public.passport_achievements enable row level security;

create policy "Users can view their own achievements"
  on public.passport_achievements for select
  to authenticated
  using (auth.uid() = user_id);

-- Deliberately no insert/update/delete policy. Writes only ever happen
-- through evaluate_passport_achievements() (see
-- passport_achievement_rpc.sql) and the one-time historical backfill
-- script, both of which are the only privileged paths that can write
-- here, a plain authenticated client can never insert an arbitrary
-- achievement_key for themselves.
