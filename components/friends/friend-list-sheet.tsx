"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { User, X, Users } from "lucide-react";

import { FriendActionButton } from "@/components/friends/friend-action-button";
import { getFriendList, type FriendListItem } from "@/lib/friends/actions";

interface FriendListSheetProps {
  /** Whose friend list this is — the caller's own id (from Passport)
   *  or another user's id (from a public profile). get_friend_list
   *  handles both the same way. */
  targetUserId: string;
  /** True when targetUserId is the signed-in viewer's own id, so the
   *  empty state and title can speak in first person and point at
   *  Discover/Find people instead of showing the plainer public
   *  wording. */
  isOwnList: boolean;
  /** First name or @username of the profile being viewed, for the
   *  sheet title when it isn't the caller's own list. */
  ownerLabel?: string;
  onClose: () => void;
}

// Same minimal-selector approach as CommentSheet/PhotoLightbox: the
// close button plus whatever's actually interactive inside (each row's
// link and its FriendActionButton).
const FOCUSABLE_SELECTOR = 'button, [href], [tabindex]:not([tabindex="-1"])';

/**
 * Mobile: a bottom sheet. Desktop: a centered modal. Exactly the same
 * shell CommentSheet already established for this app, reused rather
 * than inventing a second modal pattern for friends.
 *
 * Fetches get_friend_list on mount (not eagerly on page load — this is
 * only ever rendered once the person has actually tapped a friend/
 * mutual count) and renders the shared FriendActionButton per row, so
 * add/remove/accept/decline behavior is identical to everywhere else
 * in the app, never a second friendship state machine.
 */
export function FriendListSheet({ targetUserId, isOwnList, ownerLabel, onClose }: FriendListSheetProps) {
  const [friends, setFriends] = useState<FriendListItem[] | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setFriends(null);
    // getFriendList already swallows RPC errors into an empty array
    // (see lib/friends/actions.ts) — this can't tell a real "zero
    // friends" apart from a failed fetch, but showing the plain empty
    // state either way is harmless, never a scary error for what's
    // most often a genuine empty state.
    getFriendList(targetUserId).then((result) => {
      if (!cancelled) setFriends(result);
    });
    return () => {
      cancelled = true;
    };
  }, [targetUserId]);

  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((el) => !el.hasAttribute("disabled"));
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (e.shiftKey) {
        if (active === first || !dialogRef.current.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last || !dialogRef.current.contains(active)) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocusedRef.current?.focus();
    };
  }, [onClose]);

  const title = isOwnList ? "Your friends" : ownerLabel ? `${ownerLabel}'s friends` : "Friends";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-charcoal/40 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        className="flex h-[80dvh] w-full max-w-md min-w-0 flex-col rounded-t-2xl bg-white shadow-card sm:h-[70dvh] sm:rounded-2xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
          <p className="truncate text-sm font-medium text-charcoal">
            {title}
            {friends && friends.length > 0 && (
              <span className="ml-1.5 text-charcoal/40">({friends.length})</span>
            )}
          </p>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close friend list"
            className="shrink-0 rounded-full p-1.5 text-charcoal/40 hover:bg-crema hover:text-charcoal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
          {friends === null ? (
            <div className="space-y-2" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-[70px] animate-pulse rounded-xl bg-crema/70" />
              ))}
            </div>
          ) : friends.length === 0 ? (
            <FriendListEmptyState isOwnList={isOwnList} onNavigate={onClose} />
          ) : (
            <div className="space-y-2">
              {friends.map((f) => (
                <FriendListRow key={f.userId} friend={f} isOwnList={isOwnList} onNavigate={onClose} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FriendListEmptyState({ isOwnList, onNavigate }: { isOwnList: boolean; onNavigate: () => void }) {
  if (!isOwnList) {
    return (
      <p className="py-10 text-center text-sm text-charcoal/50">No friends yet.</p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-latte/30">
        <Users className="h-5 w-5 text-espresso/40" aria-hidden="true" />
      </div>
      <p className="max-w-[26ch] text-sm text-charcoal/60">
        No friends yet. Discover people and start building your coffee crew.
      </p>
      <div className="flex items-center gap-4">
        <Link
          href="/discover"
          onClick={onNavigate}
          className="text-sm font-medium text-espresso underline-offset-2 hover:underline"
        >
          Discover
        </Link>
        <Link
          href="/friends"
          onClick={onNavigate}
          className="text-sm font-medium text-espresso underline-offset-2 hover:underline"
        >
          Find people
        </Link>
      </div>
    </div>
  );
}

function FriendListRow({
  friend,
  isOwnList,
  onNavigate,
}: {
  friend: FriendListItem;
  /** On the caller's own friend list, every row is trivially a mutual
   *  friend of "the viewer and the profile owner" (they're the same
   *  person), so friend.isMutual is true for every row there and the
   *  label is suppressed entirely rather than shown on every friend. */
  isOwnList: boolean;
  onNavigate: () => void;
}) {
  // isMutual: this row-person is directly friends with the viewer too
  // (a real mutual friend between the viewer and the profile owner).
  // mutualCount: how many friends the viewer and this row-person have
  // in common through third parties — a different, complementary
  // number that can be 0 even when isMutual is true (direct friends
  // who happen to share no other connections).
  const showMutual = !isOwnList && friend.isMutual;
  const mutualLabel =
    friend.mutualCount > 0
      ? `${friend.mutualCount} mutual ${friend.mutualCount === 1 ? "friend" : "friends"}`
      : "Mutual friend";

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-white p-3 shadow-soft">
      <Link
        href={`/users/${friend.username}`}
        onClick={onNavigate}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-latte/30">
          {friend.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={friend.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <User className="h-5 w-5 text-espresso/40" />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium text-charcoal">{friend.firstName || friend.username}</p>
          <p className="truncate text-sm text-charcoal/50">
            @{friend.username}
            {friend.city && <span className="text-charcoal/30"> · {friend.city}</span>}
          </p>
          {showMutual && <p className="truncate text-xs text-sage">{mutualLabel}</p>}
        </div>
      </Link>
      <FriendActionButton targetUserId={friend.userId} initialState={friend.friendshipState} />
    </div>
  );
}
