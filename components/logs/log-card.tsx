"use client";

import Link from "next/link";
import { useState } from "react";
import { MapPin, Pencil, Trash2, Thermometer } from "lucide-react";

import { DeleteLogDialog } from "@/components/logs/delete-log-dialog";
import { StarDisplay } from "@/components/logs/star-display";
import { formatPrice, formatRelativeDate } from "@/lib/drink-logs/format";
import type { BeverageCategory } from "@/lib/supabase/types";

export interface LogCardData {
  id: string;
  shopId: string;
  shopName: string;
  drinkName: string;
  beverageCategory: BeverageCategory;
  drinkRating: number;
  shopRating: number;
  caption: string | null;
  photoUrl: string | null;
  photoPath: string | null;
  price: number | null;
  size: string | null;
  temperature: "hot" | "iced" | null;
  /** When the coffee actually happened, this is what's displayed and
   *  what history/recent-activity sort by. */
  loggedAt: string;
  /** When the database row was created, used only as a deterministic
   *  tiebreak when two logs share the same loggedAt. */
  createdAt: string;
}

interface LogCardProps {
  log: LogCardData;
  onDeleted: (logId: string) => void;
}

export function LogCard({ log, onDeleted }: LogCardProps) {
  const [showDelete, setShowDelete] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card">
      {log.photoUrl && (
        <div className="relative aspect-[4/3] w-full bg-charcoal/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={log.photoUrl} alt="" className="h-full w-full object-cover" />
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-charcoal">{log.drinkName}</p>
            <p className="flex items-center gap-1 text-xs text-charcoal/50">
              <MapPin className="h-3 w-3" />
              <Link href={`/shops/${log.shopId}`} className="hover:text-espresso hover:underline">
                {log.shopName}
              </Link>
            </p>
          </div>
          <StarDisplay rating={log.drinkRating} size="h-3 w-3" showValue />
        </div>

        {log.caption && <p className="mt-2 text-sm text-charcoal/70">{log.caption}</p>}

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-charcoal/50">
          <span className="flex items-center gap-1">
            Shop rating <StarDisplay rating={log.shopRating} size="h-3 w-3" />
          </span>
          {log.temperature && (
            <span className="flex items-center gap-1 capitalize">
              <Thermometer className="h-3 w-3" />
              {log.temperature}
            </span>
          )}
          {log.size && <span>{log.size}</span>}
          {log.price !== null && <span>{formatPrice(log.price)}</span>}
          <span className="ml-auto">{formatRelativeDate(log.loggedAt)}</span>
        </div>

        <div className="mt-3 flex gap-3 border-t border-border/60 pt-3">
          <Link
            href={`/log/${log.id}/edit`}
            className="flex items-center gap-1 text-xs font-medium text-charcoal/60 hover:text-espresso"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Link>
          <button
            type="button"
            onClick={() => setShowDelete(true)}
            className="flex items-center gap-1 text-xs font-medium text-charcoal/60 hover:text-error"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      </div>

      {showDelete && (
        <DeleteLogDialog
          logId={log.id}
          onCancel={() => setShowDelete(false)}
          onDeleted={() => {
            setShowDelete(false);
            onDeleted(log.id);
          }}
        />
      )}
    </div>
  );
}
