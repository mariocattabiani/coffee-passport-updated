import Link from "next/link";
import { User } from "lucide-react";

export interface FriendHereItem {
  userId: string;
  username: string;
  firstName: string | null;
  avatarUrl: string | null;
}

interface FriendsHereProps {
  friends: FriendHereItem[];
  totalCount: number;
}

/**
 * A compact single line, not a section that can ever render as a
 * large empty block: an overlapping avatar stack (max 3 shown,
 * regardless of how many were fetched) plus first names and a "+N"
 * overflow count, all resolved server-side by get_shop_friends_here /
 * get_shop_friends_here_count. Friendship never bypasses a log's own
 * visibility here — this only ever reflects a friend's PUBLIC log at
 * this café, exactly like the rest of the friends architecture.
 */
export function FriendsHere({ friends, totalCount }: FriendsHereProps) {
  if (totalCount === 0) {
    return (
      <section>
        <h2 className="mb-2 font-heading text-base font-semibold text-espresso">Friends who have been here</h2>
        <p className="text-sm text-charcoal/50">
          None of your friends have been here yet.{" "}
          <Link href="/friends" className="font-medium text-espresso underline-offset-2 hover:underline">
            Find friends
          </Link>
        </p>
      </section>
    );
  }

  const shown = friends.slice(0, 3);
  const overflow = totalCount - shown.length;
  const names = shown.map((f) => f.firstName || f.username);
  const namesLabel =
    overflow > 0 ? `${names.join(", ")} +${overflow}` : names.length === 1 ? names[0] : names.join(", ");

  return (
    <section>
      <h2 className="mb-3 font-heading text-base font-semibold text-espresso">Friends who have been here</h2>
      <div className="flex items-center gap-3">
        <div className="flex -space-x-2">
          {shown.map((f) => (
            <div
              key={f.userId}
              className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-latte/30 shadow-sm"
            >
              {f.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <User className="h-3.5 w-3.5 text-espresso/40" />
              )}
            </div>
          ))}
        </div>
        <p className="text-sm text-charcoal/70">
          {namesLabel} {totalCount === 1 ? "has" : "have"} been here
        </p>
      </div>
    </section>
  );
}
