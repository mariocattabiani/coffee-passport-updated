import Image from "next/image";
import { Star } from "lucide-react";

interface DrinkCard {
  src: string;
  drink: string;
  shop: string;
  rating: number;
  tag?: string;
}

const drinks: DrinkCard[] = [
  {
    src: "/images/hero-iced-coffee.jpg",
    drink: "Iced Oat Cortado",
    shop: "Fern & Bloom",
    rating: 4.5,
    tag: "Trending",
  },
  {
    src: "/images/log-latte-art.jpg",
    drink: "Vanilla Latte",
    shop: "The Marble Bar",
    rating: 4.8,
  },
  {
    src: "/images/discover-espresso-bar.jpg",
    drink: "Single-Origin Espresso",
    shop: "North End Coffee",
    rating: 4.6,
    tag: "Friends' pick",
  },
  {
    src: "/images/texture-machine-detail.jpg",
    drink: "Classic Cortado",
    shop: "Nine Bar Coffee",
    rating: 4.7,
  },
];

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={
            i < Math.round(rating)
              ? "h-3 w-3 fill-gold text-gold"
              : "h-3 w-3 fill-transparent text-charcoal/20"
          }
        />
      ))}
    </div>
  );
}

export function FeaturedDrinks() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
      {drinks.map((d) => (
        <div key={d.drink} className="group">
          <div className="relative aspect-[3/4] overflow-hidden rounded-lg shadow-soft">
            <Image
              src={d.src}
              alt={`${d.drink} at ${d.shop}`}
              fill
              sizes="(min-width: 1024px) 23vw, 45vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {d.tag && (
              <span className="absolute left-2.5 top-2.5 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-espresso shadow-soft">
                {d.tag}
              </span>
            )}
          </div>
          <p className="mt-3 text-sm font-medium text-charcoal">{d.drink}</p>
          <p className="text-xs text-charcoal/50">{d.shop}</p>
          <div className="mt-1.5">
            <Stars rating={d.rating} />
          </div>
        </div>
      ))}
    </div>
  );
}
