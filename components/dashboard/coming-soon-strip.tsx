import { Bookmark, Heart, MapPin } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface ComingSoonItem {
  icon: LucideIcon;
  title: string;
  description: string;
}

const ITEMS: ComingSoonItem[] = [
  { icon: Bookmark, title: "Wishlist", description: "Save drinks and shops for later." },
  { icon: Heart, title: "Favorite shops", description: "Mark your go-to cafés." },
  { icon: MapPin, title: "Nearby coffee", description: "A map is on its way." },
];

export function ComingSoonStrip() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {ITEMS.map(({ icon: Icon, title, description }) => (
        <div
          key={title}
          className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-white/50 p-3.5"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-espresso/5">
            <Icon className="h-3.5 w-3.5 text-espresso/40" />
          </div>
          <div>
            <p className="text-sm font-medium text-charcoal/70">{title}</p>
            <p className="text-xs text-charcoal/40">{description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
