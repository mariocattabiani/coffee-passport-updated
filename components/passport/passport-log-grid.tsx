import type { LogCardData } from "@/components/logs/log-card";
import { CoffeeLogGridTile } from "@/components/logs/coffee-log-grid-tile";

interface PassportLogGridProps {
  logs: LogCardData[];
}

/**
 * A plain CSS grid, not the masonry column-distribution LogCardColumns
 * uses for the old long-card layout — every tile here is the same
 * fixed 4:5 shape, so there's no variable-height problem to solve, a
 * grid is the simpler, correct tool. 2 columns on mobile (enough room
 * for photo + drink + café without cramping the text), 3 from `md`
 * up. No `xl:grid-cols-4`: Passport's own container caps at
 * `max-w-5xl` (1024px) regardless of viewport, so a wider screen never
 * unlocks more real space to divide up — a 4th column at that same
 * width would only shrink every tile, not add anything.
 *
 * Renders the shared CoffeeLogGridTile — the same tile public-profile
 * Recent Coffees uses (see ProfileActivityGrid) — mapping Passport's
 * own LogCardData into that component's neutral data shape. Passport
 * itself remains the one place deciding WHICH logs are visible here
 * (the owner's full history, public and private); this component and
 * the tile it renders have no privacy logic of their own.
 */
export function PassportLogGrid({ logs }: PassportLogGridProps) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-4 md:grid-cols-3 md:gap-4">
      {logs.map((log) => (
        <CoffeeLogGridTile
          key={log.id}
          data={{
            id: log.id,
            photoUrl: log.photoUrl,
            photoPositionX: log.photoPositionX,
            photoPositionY: log.photoPositionY,
            drinkName: log.drinkName,
            shopName: log.shopName,
            shopCity: log.shopCity,
            shopState: log.shopState,
            category: log.beverageCategory,
            temperature: log.temperature,
          }}
        />
      ))}
    </div>
  );
}
