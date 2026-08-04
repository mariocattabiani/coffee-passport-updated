import Image from "next/image";

interface ActivityItem {
  src: string;
  drink: string;
  shop: string;
}

const items: ActivityItem[] = [
  { src: "/images/log-latte-art.jpg", drink: "Vanilla Latte", shop: "The Marble Bar" },
  { src: "/images/discover-espresso-bar.jpg", drink: "Single-Origin Espresso", shop: "North End Coffee" },
  { src: "/images/hero-iced-coffee.jpg", drink: "Iced Oat Cortado", shop: "Fern & Bloom" },
  { src: "/images/passport-cafe-interior.jpg", drink: "Chai Latte", shop: "Willow & Co." },
  { src: "/images/texture-machine-detail.jpg", drink: "Cortado", shop: "Nine Bar Coffee" },
  { src: "/images/texture-reading-corner.jpg", drink: "Pour-Over", shop: "The Reading Room" },
];

function Chip({ item }: { item: ActivityItem }) {
  return (
    <div className="flex shrink-0 items-center gap-3 rounded-full border border-border/60 bg-white py-1.5 pl-1.5 pr-5 shadow-soft">
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full">
        <Image src={item.src} alt="" fill sizes="40px" className="object-cover" />
      </div>
      <div className="leading-tight">
        <p className="text-xs font-medium text-charcoal">{item.drink}</p>
        <p className="text-[11px] text-charcoal/50">{item.shop}</p>
      </div>
    </div>
  );
}

export function ActivityMarquee() {
  const row = [...items, ...items];
  return (
    <div className="relative overflow-hidden py-2 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
      <div className="flex w-max animate-marquee gap-3 hover:[animation-play-state:paused]">
        {row.map((item, i) => (
          <Chip item={item} key={`${item.drink}-${i}`} />
        ))}
      </div>
    </div>
  );
}
