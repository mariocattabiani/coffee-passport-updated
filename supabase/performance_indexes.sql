-- Coffee Passport: performance audit findings.
--
-- Additive/corrective only, no destructive data changes, no
-- speculative indexes — both changes below are justified by an actual
-- current query pattern, not "might help someday".

-- ---------------------------------------------------------------------
-- Genuinely missing: get_friends_feed and get_friends_leaderboard both
-- run `where f.status = 'accepted' and (f.requester_id = auth.uid() or
-- f.addressee_id = auth.uid())` on every visit to Discover's Friends
-- tab and Leaderboard's Friends tab — a real, frequently-hit query
-- shape. The only existing friendships index
-- (friendships_addressee_pending_idx) is scoped to status = 'pending'
-- and only covers addressee_id, so it does nothing for this accepted-
-- friends, either-participant lookup. Two partial indexes (one per
-- participant column, both scoped to accepted rows) let Postgres serve
-- the OR condition via a bitmap-or of both index scans instead of a
-- sequential scan.
-- ---------------------------------------------------------------------
create index if not exists friendships_requester_accepted_idx
  on public.friendships (requester_id)
  where status = 'accepted';

create index if not exists friendships_addressee_accepted_idx
  on public.friendships (addressee_id)
  where status = 'accepted';

-- ---------------------------------------------------------------------
-- Redundant, found during this audit: drink_logs_user_id_idx (added in
-- the leaderboard sprint, a plain single-column index on user_id) is
-- fully covered by drink_logs_user_logged_idx (user_id, logged_at
-- desc), which already existed — user_id is that composite index's
-- LEADING column, so Postgres can already use it for any query that
-- only filters/groups by user_id, exactly the leaderboard's own
-- `group by dl.user_id` access pattern this was added for. An extra
-- index with no read benefit still costs every future write (insert/
-- update/delete) a little more work to maintain, so it's dropped here
-- rather than left in place now that the redundancy is recognized.
-- ---------------------------------------------------------------------
drop index if exists public.drink_logs_user_id_idx;
