-- Coffee Passport: Sprint 3A drink logging schema.
-- Run this once in the Supabase SQL Editor. Additive only: it does not
-- touch profiles, user_shop_preferences, or anything from schema.sql.

-- ---------------------------------------------------------------------
-- shops
-- A café. Sprint 3A only ever reads from this table through the app
-- (see the RLS policies below); rows come from seed_shops.sql. Built so
-- Google Places can populate and extend it later without a redesign.
-- ---------------------------------------------------------------------
create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  city text,
  state text,
  latitude numeric,
  longitude numeric,
  google_place_id text unique,
  is_chain boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shops enable row level security;

create policy "Authenticated users can view shops"
  on public.shops for select
  to authenticated
  using (true);

-- Deliberately no insert/update/delete policy for regular users this
-- sprint. Shops are seed-only for now (see flag #8 from the approved
-- plan); RLS denies by default when a table has no matching policy, so
-- this is a real lock, not just an omission.

create index if not exists shops_name_lower_idx on public.shops (lower(name));

-- ---------------------------------------------------------------------
-- drinks
-- A specific drink at a specific shop (e.g. "Honey Lavender Latte" at
-- Fern & Bloom). Shared data: any signed-in user can read the list and
-- add a new one, but nobody can edit or delete one once it exists.
-- ---------------------------------------------------------------------
create table if not exists public.drinks (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null,
  category text not null check (category in ('coffee', 'tea')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.drinks enable row level security;

create policy "Authenticated users can view drinks"
  on public.drinks for select
  to authenticated
  using (true);

create policy "Authenticated users can add drinks"
  on public.drinks for insert
  to authenticated
  with check (created_by = auth.uid());

-- No update or delete policy: once a drink exists, it's permanent shared
-- data for this sprint, matching "do not allow arbitrary updates or
-- deletion of shared drink data."

-- Case-insensitive duplicate guard, scoped to one shop. "Vanilla Latte"
-- and "vanilla latte" at the same café collide; the same name at a
-- different shop is fine. This index is also what the app relies on to
-- safely recover from the two-users-add-the-same-drink race condition.
create unique index if not exists drinks_shop_name_lower_idx
  on public.drinks (shop_id, lower(name));

-- drinks.id is already unique on its own (it's the primary key). This
-- additional constraint on the pair (id, shop_id) adds no new
-- uniqueness rule, its only purpose is to give Postgres something valid
-- to point a composite foreign key at, so drink_logs below can enforce
-- "this drink actually belongs to this shop" as a database-level
-- guarantee, not just an application-level check.
alter table public.drinks
  add constraint drinks_id_shop_id_key unique (id, shop_id);

-- ---------------------------------------------------------------------
-- drink_logs
-- One user's record of one drink they had. Private to its owner.
--
-- Note: "id" has no default. The app always generates this id on the
-- client (crypto.randomUUID()) before it exists in the database, so a
-- drink photo can be uploaded to a fully predictable Storage path
-- (see drink_photos_storage.sql) even before the row is created.
-- ---------------------------------------------------------------------
create table if not exists public.drink_logs (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  shop_id uuid not null references public.shops(id) on delete restrict,
  drink_id uuid not null,
  beverage_category text not null check (beverage_category in ('coffee', 'tea')),
  drink_rating numeric(2,1) not null
    check (drink_rating in (0.5,1.0,1.5,2.0,2.5,3.0,3.5,4.0,4.5,5.0)),
  shop_rating numeric(2,1) not null
    check (shop_rating in (0.5,1.0,1.5,2.0,2.5,3.0,3.5,4.0,4.5,5.0)),
  caption text check (caption is null or char_length(caption) <= 500),
  -- Storage object path, not a public URL. The drink-photos bucket is
  -- private, so the app turns this into a short-lived signed URL at
  -- render time. Always of the form "{userId}/{logId}.jpg".
  photo_url text,
  price numeric(10,2) check (price is null or (price >= 0 and price < 1000)),
  size text check (size is null or char_length(size) <= 40),
  temperature text check (temperature is null or temperature in ('hot', 'iced')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Enforces, at the database level, that the drink actually belongs to
  -- the shop the log claims it was ordered at. References the
  -- composite unique constraint on drinks(id, shop_id) above. A single
  -- (drink_id) foreign key is deliberately not also declared alongside
  -- this one, that would just be a redundant, weaker version of the
  -- same rule this composite key already fully covers.
  foreign key (drink_id, shop_id) references public.drinks(id, shop_id) on delete restrict
);

alter table public.drink_logs enable row level security;

create policy "Users can view their own logs"
  on public.drink_logs for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own logs"
  on public.drink_logs for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own logs"
  on public.drink_logs for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own logs"
  on public.drink_logs for delete
  to authenticated
  using (auth.uid() = user_id);

-- Recent-activity and "my logs" queries always filter by user and sort
-- by newest first, this index matches that access pattern exactly.
create index if not exists drink_logs_user_created_idx
  on public.drink_logs (user_id, created_at desc);

-- For the shop/drink pages a later sprint will add (top drinks, etc).
create index if not exists drink_logs_shop_idx on public.drink_logs (shop_id);
create index if not exists drink_logs_drink_idx on public.drink_logs (drink_id);
