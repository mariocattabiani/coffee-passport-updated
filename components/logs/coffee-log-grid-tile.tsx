import Link from "next/link";
import { Coffee, Leaf } from "lucide-react";

import { formatShopLocation } from "@/components/discover/feed-card";

export interface CoffeeLogGridTileData {
  id: string;
  photoUrl: string | null;
  photoPositionX: number | null;
  photoPositionY: number | null;
  drinkName: string;
  shopName: string;
  shopCity: string | null;
  shopState: string | null;
  category: "coffee" | "tea";
  temperature: "hot" | "iced" | null;
}

interface CoffeeLogGridTileProps {
  data: CoffeeLogGridTileData;
}

/**
 * The one gallery-grid tile shared by Passport's own history AND
 * public-profile Recent Coffees — genuinely the same visual unit in
 * both places, per the product direction. Deliberately takes a
 * neutral data shape rather than either surface's own row type
 * (LogCardData for Passport, FeedItem for the profile feed): shared
 * PRESENTATION is right here, shared AUTHORIZATION/data-fetching is
 * not — each caller maps its own already-correctly-scoped data (owner
 * history including private logs for Passport, public-only for the
 * profile) into this shape, this component never decides what's
 * allowed to be shown, only how to show it.
 *
 * Tap target is the whole tile, straight to /logs/[id] — no Like/
 * Comment/Save here, that's the detail page's job (mirrors Instagram's
 * own profile-grid-browses / detail-interacts split).
 */
export function CoffeeLogGridTile({ data }: CoffeeLogGridTileProps) {
  const hasPhoto = !!data.photoUrl;
  const objectPosition = `${data.photoPositionX ?? 50}% ${data.photoPositionY ?? 50}%`;
  const location = formatShopLocation(data.shopCity, data.shopState);

  return (
    <Link
      href={`/logs/${data.id}`}
      aria-label={`View ${data.drinkName} at ${data.shopName}`}
      className="group block min-w-0 focus-visible:outline-none"
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-lg bg-latte/20">
        {hasPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.photoUrl ?? undefined}
            alt=""
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03] group-focus-visible:scale-[1.03]"
            style={{ objectPosition }}
          />
        ) : (
          <NoPhotoCard data={data} location={location} />
        )}
        <div className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-inset ring-charcoal/5 transition-colors group-focus-visible:ring-2 group-focus-visible:ring-espresso" />
      </div>

      {/* Fixed-height footer reserved on EVERY tile, photo or not, so
          grid rows stay aligned regardless of which tiles in a row
          have a photo — a photo tile's drink/café text lives here; a
          no-photo tile's footer stays empty on purpose (that same
          information is already inside its designed info card above),
          not duplicated, but the space is still reserved so the row's
          height doesn't visibly shift tile to tile. */}
      <div className="mt-1.5 min-h-[34px] min-w-0">
        {hasPhoto && (
          <>
            <p className="truncate text-sm font-medium text-charcoal">{data.drinkName}</p>
            <p className="truncate text-xs text-charcoal/50">{data.shopName}</p>
          </>
        )}
      </div>
    </Link>
  );
}

/**
 * The no-photo fallback: a designed "journal card" filling the same
 * 4:5 media area a photo would, not an empty gray rectangle. Uses the
 * space productively — icon, drink, café, city/state when known,
 * category + temperature — since there's no photo competing for that
 * room. Quiet, brand-palette gradient (crema/latte), never a stock
 * photo or generated imagery.
 */
function NoPhotoCard({ data, location }: { data: CoffeeLogGridTileData; location: string | null }) {
  const Icon = data.category === "tea" ? Leaf : Coffee;

  return (
    <div className="flex h-full w-full flex-col justify-between bg-gradient-to-br from-crema to-latte/30 p-3">
      <Icon className="h-5 w-5 shrink-0 text-espresso/40" aria-hidden="true" />
      <div className="min-w-0">
        <p className="line-clamp-2 text-sm font-semibold leading-snug text-espresso">{data.drinkName}</p>
        <p className="mt-1 truncate text-xs font-medium text-charcoal/70">{data.shopName}</p>
        {location && <p className="truncate text-[11px] text-charcoal/50">{location}</p>}
        <p className="mt-1 text-[11px] capitalize text-charcoal/40">
          {data.category}
          {data.temperature ? ` · ${data.temperature}` : ""}
        </p>
      </div>
    </div>
  );
}
