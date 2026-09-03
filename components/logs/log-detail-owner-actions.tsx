"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { DeleteLogDialog } from "@/components/logs/delete-log-dialog";

interface LogDetailOwnerActionsProps {
  logId: string;
}

/**
 * Only ever rendered when the current viewer is this log's own owner
 * (see /logs/[id]/page.tsx). This exists because the Passport grid
 * redesign sends every tile — including private logs, which have no
 * social surface at all — straight to /logs/[id], and this is now
 * where owner management lives instead of cluttering every grid tile
 * with its own Edit/Delete affordance (Passport's tiles stay a clean
 * gallery; this page is where "manage this log" actually happens).
 *
 * Deleting redirects back to /passport rather than trying to patch
 * the grid's already-rendered state from a different page/navigation
 * — a fresh Passport page load already re-fetches everything
 * correctly, no cross-page state sync needed.
 */
export function LogDetailOwnerActions({ logId }: LogDetailOwnerActionsProps) {
  const [showDelete, setShowDelete] = useState(false);
  const router = useRouter();

  return (
    <div className="flex items-center gap-4 border-t border-border/60 px-4 py-3">
      <Link
        href={`/log/${logId}/edit`}
        className="flex items-center gap-1.5 text-xs font-medium text-charcoal/60 hover:text-espresso"
      >
        <Pencil className="h-3.5 w-3.5" />
        Edit
      </Link>
      <button
        type="button"
        onClick={() => setShowDelete(true)}
        className="flex items-center gap-1.5 text-xs font-medium text-charcoal/60 hover:text-error"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete
      </button>

      {showDelete && (
        <DeleteLogDialog
          logId={logId}
          onCancel={() => setShowDelete(false)}
          onDeleted={() => router.push("/passport")}
        />
      )}
    </div>
  );
}
