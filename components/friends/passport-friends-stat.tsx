"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";

import { FriendListSheet } from "@/components/friends/friend-list-sheet";

interface PassportFriendsStatProps {
  userId: string;
  count: number;
}

/**
 * Renders as one cell of PassportHeader's 2x2 secondary-stat grid,
 * matching Cafés/Cities/Stamps' exact number-over-label treatment
 * (same font size, same uppercase tiny label) so Friends reads as a
 * real stat rather than a small footer link. The button wraps only
 * this cell, never the whole card, and the chevron plus a hover/focus
 * color shift on the label are the only signal that this particular
 * cell — unlike its three neighbors — is interactive.
 */
export function PassportFriendsStat({ userId, count }: PassportFriendsStatProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex w-full items-start justify-between gap-2 rounded-sm text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crema/40"
      >
        <span>
          <span className="block font-heading text-xl font-semibold text-crema sm:text-2xl">{count}</span>
          <span className="mt-0.5 block text-[10px] uppercase tracking-wide text-crema/50 transition-colors group-hover:text-crema/70 group-focus-visible:text-crema/70">
            {count === 1 ? "Friend" : "Friends"}
          </span>
        </span>
        <ChevronRight
          className="mt-1 h-3.5 w-3.5 shrink-0 text-crema/25 transition-colors group-hover:text-crema/60 group-focus-visible:text-crema/60"
          aria-hidden="true"
        />
      </button>
      {open && <FriendListSheet targetUserId={userId} isOwnList onClose={() => setOpen(false)} />}
    </>
  );
}
