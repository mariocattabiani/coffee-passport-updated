"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";

interface ShareButtonProps {
  title: string;
  text: string;
  /** Absolute or relative URL to share; resolved against location.origin
   *  when relative. */
  url: string;
  className?: string;
}

/**
 * Real, working functionality only, never a placeholder: the Web Share
 * API on devices that support it (mobile browsers, mostly), falling
 * back to copying the link to the clipboard everywhere else, with a
 * brief "Copied" confirmation. No backend, no new route, nothing that
 * pretends to do more than this.
 */
export function ShareButton({ title, text, url, className }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const absoluteUrl = new URL(url, window.location.origin).toString();

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: absoluteUrl });
      } catch {
        // User canceled the share sheet or it failed silently — no
        // error state needed, this isn't a failure worth surfacing.
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access denied — nothing more we can do here without
      // inventing a fake action.
    }
  }

  return (
    <button type="button" onClick={handleShare} className={className}>
      {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
      {copied ? "Copied" : "Share"}
    </button>
  );
}
