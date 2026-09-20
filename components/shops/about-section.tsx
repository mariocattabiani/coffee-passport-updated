import { MapPin, Navigation, Store } from "lucide-react";

import type { Shop } from "@/lib/supabase/types";

interface AboutSectionProps {
  shop: Shop;
}

function directionsUrl(shop: Shop): string {
  const destination =
    shop.latitude !== null && shop.longitude !== null
      ? `${shop.latitude},${shop.longitude}`
      : [shop.name, shop.address, shop.city, shop.state].filter(Boolean).join(", ");
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

/**
 * V2.1: an open section with a top rule, not a white card — Only
 * fields Coffee Passport actually persists durably: address, city/
 * state/country, and independent/chain status. Deliberately no
 * website, phone, or hours row — none of that is fetched or stored
 * anywhere in the current architecture (see the comment in
 * lib/explore/nearby-search-actions.ts), and adding a live Google
 * Place Details call just to fill this section would cross exactly
 * the persistence and API-cost boundary this sprint was told to
 * respect. If that data becomes available later, a row can be added
 * here without changing this component's shape.
 */
export function AboutSection({ shop }: AboutSectionProps) {
  const cityStateCountry = [shop.city, shop.state, shop.country].filter(Boolean).join(", ");

  return (
    <section className="border-t border-border/60 pt-6">
      <h2 className="mb-4 font-heading text-lg font-semibold text-espresso">About</h2>
      <div className="space-y-3 text-sm">
        {shop.address && (
          <div className="flex items-start gap-2.5">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-charcoal/40" aria-hidden="true" />
            <div>
              <p className="text-charcoal/80">{shop.address}</p>
              {cityStateCountry && <p className="text-charcoal/50">{cityStateCountry}</p>}
            </div>
          </div>
        )}
        <div className="flex items-center gap-2.5">
          <Store className="h-4 w-4 shrink-0 text-charcoal/40" aria-hidden="true" />
          <p className="text-charcoal/80">{shop.is_chain ? "Chain café" : "Independent café"}</p>
        </div>
      </div>
      <a
        href={directionsUrl(shop)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-espresso underline-offset-2 hover:underline"
      >
        <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
        Get directions
      </a>
    </section>
  );
}
