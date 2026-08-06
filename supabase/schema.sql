-- Coffee Passport — Sprint 2 schema
-- Run this once in the Supabase SQL Editor (Project -> SQL Editor -> New query).

-- ---------------------------------------------------------------------
-- profiles
-- One row per user, created automatically the moment someone signs up
-- (see the trigger at the bottom). Fully filled in once onboarding is
-- complete.
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  username text unique,
  city text,
  state text,
  bio text,
  avatar_url text,
  favorite_drinks text[] not null default '{}',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- ---------------------------------------------------------------------
-- user_shop_preferences
-- Favorite / want-to-try / been, collected during onboarding against the
-- mock shop list. Will point at a real coffee_shops table once Google
-- Places is integrated in a later sprint.
-- ---------------------------------------------------------------------
create table if not exists public.user_shop_preferences (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  shop_id text not null,
  shop_name text not null,
  status text not null check (status in ('favorite', 'want_to_try', 'been')),
  created_at timestamptz not null default now(),
  unique (profile_id, shop_id)
);

alter table public.user_shop_preferences enable row level security;

create policy "Users can view their own shop preferences"
  on public.user_shop_preferences for select
  using (auth.uid() = profile_id);

create policy "Users can insert their own shop preferences"
  on public.user_shop_preferences for insert
  with check (auth.uid() = profile_id);

create policy "Users can delete their own shop preferences"
  on public.user_shop_preferences for delete
  using (auth.uid() = profile_id);

-- ---------------------------------------------------------------------
-- Auto-create a blank profile row whenever someone signs up, so the app
-- never has to handle a signed-in user with no profile row.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
