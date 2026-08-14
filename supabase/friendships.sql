-- Coffee Passport: Sprint 3F, the friend network's canonical table.
-- Run once in the SQL Editor. Additive only, does not touch or rerun
-- any earlier migration.
--
-- user_low/user_high are generated columns holding the pair in a
-- canonical, order-independent form. The unique constraint is on that
-- pair, not on (requester_id, addressee_id), that's what actually
-- guarantees at most one row can ever exist between any two users
-- regardless of who requested, and it's enforced atomically by
-- Postgres, immune to a race between two concurrent requests. Only two
-- statuses are ever stored: decline, cancel, and remove are all
-- deletions, not a third status, there's no persistent "declined"
-- state to manage or display.

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  user_low uuid generated always as (least(requester_id, addressee_id)) stored,
  user_high uuid generated always as (greatest(requester_id, addressee_id)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friendships_no_self check (requester_id <> addressee_id),
  constraint friendships_unique_pair unique (user_low, user_high)
);

alter table public.friendships enable row level security;

-- Participants can read their own relationship rows directly, this is
-- safe as a plain policy since it only ever exposes rows the caller is
-- already part of. All writes go through the RPCs in
-- friendship_rpcs.sql instead, deliberately no insert/update/delete
-- policy here at all, RLS denies by default with none present.
create policy "Participants can view their own friendships"
  on public.friendships for select
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- Matches the "incoming requests" and pending-count lookups exactly,
-- partial so it only ever indexes pending rows.
create index if not exists friendships_addressee_pending_idx
  on public.friendships (addressee_id, status)
  where status = 'pending';
