"use client";

import { useState, type ReactNode } from "react";

interface ProfileTabsProps {
  postsContent: ReactNode;
  savedContent: ReactNode;
}

type Tab = "posts" | "saved";

/**
 * Only ever rendered by the profile page when the viewer is looking at
 * their own profile (friendshipState === "self") — a stranger or
 * friend visiting someone else's profile never sees this control at
 * all, they see the plain "Recent coffees" section exactly as before.
 * Saved itself stays private regardless (get_my_saves is hardcoded to
 * auth.uid()), this is just the one place the tab is offered.
 *
 * Same compact pill styling as CitiesDrinksSection's Cities/Drinks
 * control, for visual consistency within the same profile page.
 */
export function ProfileTabs({ postsContent, savedContent }: ProfileTabsProps) {
  const [tab, setTab] = useState<Tab>("posts");

  return (
    <div>
      <div className="mb-4 inline-flex rounded-full border border-border bg-white p-1">
        <button
          type="button"
          onClick={() => setTab("posts")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "posts" ? "bg-espresso text-crema" : "text-charcoal hover:text-espresso"
          }`}
        >
          Posts
        </button>
        <button
          type="button"
          onClick={() => setTab("saved")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "saved" ? "bg-espresso text-crema" : "text-charcoal hover:text-espresso"
          }`}
        >
          Saved
        </button>
      </div>

      {tab === "posts" ? postsContent : savedContent}
    </div>
  );
}
