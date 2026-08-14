"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Check, X, Clock, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  cancelFriendRequest,
  removeFriend,
  type FriendshipState,
  type FriendshipActionResult,
} from "@/lib/friends/actions";

interface FriendActionButtonProps {
  targetUserId: string;
  initialState: FriendshipState;
  size?: "sm" | "default";
}

/**
 * Not optimistic: the button's displayed state only ever changes after
 * the server RPC has actually returned success, never before. Every
 * RPC already returns a structured (success, message) result, so this
 * has no need to guess, it just reflects what really happened. A
 * failed action leaves the state exactly as it was and shows the
 * server's own message.
 */
export function FriendActionButton({ targetUserId, initialState, size = "sm" }: FriendActionButtonProps) {
  const [state, setState] = useState<FriendshipState>(initialState);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const router = useRouter();

  async function run(action: () => Promise<FriendshipActionResult>, nextStateOnSuccess: FriendshipState) {
    setPending(true);
    setError(null);
    const result = await action();
    if (result.success) {
      setState(nextStateOnSuccess);
      router.refresh();
    } else {
      setError(result.message);
    }
    setPending(false);
    setConfirmingRemove(false);
  }

  if (state === "self") return null;

  if (state === "none") {
    return (
      <div>
        <Button
          size={size}
          onClick={() => run(() => sendFriendRequest(targetUserId), "outgoing_pending")}
          disabled={pending}
          className="gap-1.5"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Add friend
        </Button>
        {error && <p className="mt-1 text-xs text-error">{error}</p>}
      </div>
    );
  }

  if (state === "outgoing_pending") {
    return (
      <div>
        <div className="flex items-center gap-2">
          <Button size={size} variant="outline" disabled className="gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Request sent
          </Button>
          <button
            type="button"
            onClick={() => run(() => cancelFriendRequest(targetUserId), "none")}
            disabled={pending}
            className="text-xs font-medium text-charcoal/40 hover:text-charcoal/70"
          >
            Cancel
          </button>
        </div>
        {error && <p className="mt-1 text-xs text-error">{error}</p>}
      </div>
    );
  }

  if (state === "incoming_pending") {
    return (
      <div>
        <div className="flex items-center gap-2">
          <Button
            size={size}
            onClick={() => run(() => acceptFriendRequest(targetUserId), "friends")}
            disabled={pending}
            className="gap-1.5"
          >
            <Check className="h-3.5 w-3.5" />
            Accept
          </Button>
          <Button
            size={size}
            variant="outline"
            onClick={() => run(() => declineFriendRequest(targetUserId), "none")}
            disabled={pending}
            className="gap-1.5"
          >
            <X className="h-3.5 w-3.5" />
            Decline
          </Button>
        </div>
        {error && <p className="mt-1 text-xs text-error">{error}</p>}
      </div>
    );
  }

  // friends
  return (
    <div>
      <div className="flex items-center gap-2">
        <Button size={size} variant="outline" disabled className="gap-1.5">
          <Users className="h-3.5 w-3.5" />
          Friends
        </Button>
        {confirmingRemove ? (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-charcoal/50">Remove?</span>
            <button
              type="button"
              onClick={() => run(() => removeFriend(targetUserId), "none")}
              disabled={pending}
              className="font-medium text-error hover:underline"
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => setConfirmingRemove(false)}
              className="font-medium text-charcoal/40 hover:underline"
            >
              No
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingRemove(true)}
            className="text-xs font-medium text-charcoal/40 hover:text-charcoal/70"
          >
            Remove
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-error">{error}</p>}
    </div>
  );
}
