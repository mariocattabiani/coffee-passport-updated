-- Coffee Passport: Phase 2A — Save / Wishlist intent.
-- Run once in the SQL Editor, after public_feed.sql. Additive only,
-- does not touch or weaken drink_logs RLS, does not touch or migrate
-- the existing (dormant) public.user_shop_preferences table.
--
-- Product semantics: a save is NOT a bookmark of a social post. It is
-- durable "I want to try this drink at this café" intent, identified
-- by (user, shop, drink), not by the post it was discovered through.
-- source_log_id is provenance only — if the original post is later
-- deleted, the save survives with source_log_id set to null, it does
-- not disappear. See toggle_save below for how this is enforced.
--
-- This intentionally supersedes the dormant onboarding-era
-- user_shop_preferences.status = 'want_to_try' rows for anything new
-- going forward: that table's shop_id is text against a mock shop
-- list with no reliable mapping to the real public.shops(id) uuid
-- rows, so those old rows are left untouched as legacy/dead data
-- rather than speculatively migrated (see the accompanying report).

create table if not exists public.saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  shop_id uuid not null references public.shops(id) on delete cascade,
  -- Nullable on purpose: a café-only save ("I want to try this place",
  -- no specific drink yet) is a real, supported case, not a
  -- placeholder. Drink deletion CASCADEs rather than SET NULLs: the
  -- intent behind a drink-specific save is "I want THAT drink", not
  -- "I want some drink at this café" — if the drink itself is gone,
  -- degrading the row to a café-only save (drink_id = null) would be
  -- fabricating a different, weaker intent the user never actually
  -- expressed, and would collide with saves_user_shop_cafe_only_key
  -- below whenever a real café-only save already exists for the same
  -- (user, shop). Cascading deletes the row cleanly instead: any
  -- separately-existing café-only save for the same café is a
  -- different row entirely and is never touched by this. (Schema
  -- currently has no delete path for drinks at all — no delete
  -- policy exists — so this is defensive/future-proofing, not
  -- exercised today.)
  drink_id uuid references public.drinks(id) on delete cascade,
  -- Provenance only, never load-bearing for the save's own identity.
  -- If the source post is deleted, this becomes null and the save is
  -- untouched — see toggle_save's handling and log_likes/drink_logs
  -- cascade behavior is deliberately NOT mirrored here.
  source_log_id uuid references public.drink_logs(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.saves enable row level security;

-- Saves are private personal data. No other user, and no anonymous
-- caller, can ever read another person's saves — there is no public
-- "who saved this" surface in this or any future phase implied by
-- this schema. Every read of "did the CURRENT viewer save this" for
-- feed purposes happens inside a SECURITY DEFINER feed RPC (which
-- checks auth.uid() = the querying user, not a broader read), not
-- through this policy.
drop policy if exists "Users can view their own saves" on public.saves;

create policy "Users can view their own saves"
  on public.saves for select
  to authenticated
  using (auth.uid() = user_id);

-- Deliberately no INSERT/UPDATE/DELETE policy here. All mutation goes
-- through toggle_save below, a SECURITY DEFINER function that derives
-- the user from auth.uid() itself (never trusts a client-supplied
-- user id) and does the existence-check-and-toggle as a single
-- server-side operation, so there's one atomic, race-safe path to
-- create or remove a save, not two independently-callable, racy
-- client mutations.
--
-- ---------------------------------------------------------------------
-- Uniqueness: exactly one saved (user, shop, drink) combination, and
-- exactly one café-only (user, shop) combination where drink_id is
-- null, using two PARTIAL unique indexes rather than one plain
-- UNIQUE(user_id, shop_id, drink_id) constraint. A plain unique
-- constraint would NOT prevent duplicate café-only saves: Postgres
-- treats every NULL as distinct from every other NULL for uniqueness
-- purposes, so two rows with drink_id = null would both satisfy a
-- naive UNIQUE(user_id, shop_id, drink_id) constraint. These two
-- partial indexes each cover one real case explicitly:
-- ---------------------------------------------------------------------

-- At most one drink-specific save per (user, shop, drink).
create unique index if not exists saves_user_shop_drink_key
  on public.saves (user_id, shop_id, drink_id)
  where drink_id is not null;

-- At most one café-only save per (user, shop). A drink-specific save
-- and a café-only save for the same café can coexist for the same
-- user (e.g. "want to try this café" plus, separately, "want to try
-- the oat latte here") — that's intentional, not a gap.
create unique index if not exists saves_user_shop_cafe_only_key
  on public.saves (user_id, shop_id)
  where drink_id is null;

-- Feed lookups check "does the current viewer have a save matching
-- this exact (shop_id, drink_id)" once per feed row via a LATERAL
-- join (see social_feed_v2.sql) — the drink-specific partial index
-- above already covers that access pattern (leading columns
-- user_id, shop_id, drink_id, all used with equality), no separate
-- index is needed for it.

-- ---------------------------------------------------------------------
-- toggle_save: the only way a save is ever created or removed.
-- ---------------------------------------------------------------------
create or replace function public.toggle_save(
  target_shop_id uuid,
  target_drink_id uuid default null,
  target_source_log_id uuid default null
)
returns table (saved boolean, save_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_id uuid;
  v_new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- The save's own identity is (user, shop, drink) — never
  -- source_log_id — so saving the same drink/café discovered through
  -- a second, different post still resolves to the same row and
  -- toggles it off, exactly as if it were the first post.
  select id into v_existing_id
  from public.saves
  where user_id = auth.uid()
    and shop_id = target_shop_id
    and (
      (target_drink_id is not null and drink_id = target_drink_id)
      or (target_drink_id is null and drink_id is null)
    )
  limit 1;

  if v_existing_id is not null then
    delete from public.saves where id = v_existing_id;
    return query select false, v_existing_id;
    return;
  end if;

  -- Reject a malformed shop/drink pairing before ever creating a row.
  -- The database is the authority here, not whatever the client
  -- happened to send — a drink-specific save must reference a drink
  -- that actually belongs to the stated café.
  if target_drink_id is not null then
    if not exists (
      select 1 from public.drinks d
      where d.id = target_drink_id and d.shop_id = target_shop_id
    ) then
      raise exception 'That drink does not belong to this café.';
    end if;
  end if;
  -- Café-only saves (target_drink_id is null) need no drink check.
  -- target_shop_id's own existence is already enforced by saves'
  -- shop_id foreign key at insert time below, no redundant check
  -- needed here.

  -- Provenance must be exact, not merely "some public log": the
  -- source log's own shop must match target_shop_id, and, for a
  -- drink-specific save, its drink must match target_drink_id too.
  -- A mismatched, private, or nonexistent source log is a hard error
  -- here, not a silently-dropped nicety — misleading provenance
  -- ("discovered via this post") would be worse than none. Passing
  -- target_source_log_id = null is always valid: a direct save with
  -- no originating post (e.g. a future Wishlist "save" button on a
  -- shop/drink page itself, not from a social post).
  if target_source_log_id is not null then
    if not exists (
      select 1 from public.drink_logs dl
      where dl.id = target_source_log_id
        and dl.visibility = 'public'
        and dl.shop_id = target_shop_id
        and (target_drink_id is null or dl.drink_id = target_drink_id)
    ) then
      raise exception 'That post does not match this café/drink.';
    end if;
  end if;

  begin
    insert into public.saves (user_id, shop_id, drink_id, source_log_id)
    values (auth.uid(), target_shop_id, target_drink_id, target_source_log_id)
    returning id into v_new_id;
  exception when unique_violation then
    -- A concurrent request already created the same save; treat this
    -- as success and return the row that actually exists rather than
    -- erroring — database uniqueness is the final authority, this
    -- function just reconciles with whatever it decided.
    select id into v_new_id
    from public.saves
    where user_id = auth.uid()
      and shop_id = target_shop_id
      and (
        (target_drink_id is not null and drink_id = target_drink_id)
        or (target_drink_id is null and drink_id is null)
      )
    limit 1;
  end;

  return query select true, v_new_id;
end;
$$;

revoke all on function public.toggle_save(uuid, uuid, uuid) from public;
revoke all on function public.toggle_save(uuid, uuid, uuid) from anon;
grant execute on function public.toggle_save(uuid, uuid, uuid) to authenticated;
