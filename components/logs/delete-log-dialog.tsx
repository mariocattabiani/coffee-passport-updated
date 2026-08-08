"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { deleteDrinkLog } from "@/lib/drink-logs/actions";

interface DeleteLogDialogProps {
  logId: string;
  onCancel: () => void;
  onDeleted: () => void;
}

export function DeleteLogDialog({ logId, onCancel, onDeleted }: DeleteLogDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    const result = await deleteDrinkLog(logId);
    if (result?.error) {
      setError(result.error);
      setDeleting(false);
      return;
    }
    onDeleted();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-log-title"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-card">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-error/10">
          <AlertTriangle className="h-5 w-5 text-error" />
        </div>
        <h3 id="delete-log-title" className="mt-4 font-heading text-lg font-semibold text-espresso">
          Delete this coffee log?
        </h3>
        <p className="mt-1.5 text-sm text-charcoal/60">This cannot be undone.</p>

        {error && <p className="mt-3 text-sm text-error">{error}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="ghost" ref={cancelRef} onClick={onCancel} disabled={deleting}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="bg-error text-crema hover:bg-error/90"
          >
            {deleting ? "Deleting..." : "Delete log"}
          </Button>
        </div>
      </div>
    </div>
  );
}
