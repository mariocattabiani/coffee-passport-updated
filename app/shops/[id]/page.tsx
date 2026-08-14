import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import type { Shop, BeverageCategory, Temperature } from "@/lib/supabase/types";
import { AuthenticatedHeader } from "@/components/dashboard/authenticated-header";
import { ShopHero } from "@/components/shops/shop-hero";
import { TopDrinks, type TopDrink } from "@/components/shops/top-drinks";
import { YourPassportHere, type YourPassportStats } from "@/components/shops/your-passport-here";
import type { LogCardData } from "@/components/logs/log-card";

interface ShopPageProps {
  params: Promise<{ id: string }>;
}

interface OwnLogRow {
  id: string;
  drink_rating: number;
  shop_rating: number;
  caption: string | null;
  photo_url: string | null;
  price: number | null;
  size: string | null;
  temperature: Temperature | null;
  beverage_category: BeverageCategory;
  created_at: string;
  logged_at: string;
  drink: { id: string; name: string } | null;
}

interface RatingSummaryRow {
  avg_rating: number | null;
  rating_count: number;
}

interface TopDrinkRow {
  drink_id: string;
  drink_name: string;
  category: BeverageCategory;
  avg_rating: number | null;
  rating_count: number;
}

export async function generateMetadata({ params }: ShopPageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: shop } = await supabase.from("shops").select("name").eq("id", id).maybeSingle<{ name: string }>();
  return { title: shop ? `${shop.name} | Coffee Passport` : "Café | Coffee Passport" };
}

export default async function ShopPage({ params }: ShopPageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // shops.select is readable by any authenticated user (existing RLS),
  // no coordinates are required for anything on this page.
  const { data: shop } = await supabase.from("shops").select("*").eq("id", id).maybeSingle<Shop>();
  if (!shop) notFound();

  const [{ data: ratingSummary }, { data: topDrinksRaw }, { data: ownLogsRaw }] = await Promise.all([
    supabase.rpc("get_shop_rating_summary", { target_shop_id: id }).maybeSingle<RatingSummaryRow>(),
supabase.rpc("get_shop_top_drinks", {
  target_shop_id: id,
  result_limit: 10,
}),
    supabase
      .from("drink_logs")
      .select(
        "id, drink_rating, shop_rating, caption, photo_url, price, size, temperature, beverage_category, created_at, logged_at, drink:drinks(id,name)"
      )
      .eq("shop_id", id)
      .eq("user_id", user.id)
      .order("logged_at", { ascending: false })
      .order("created_at", { ascending: false })
      .returns<OwnLogRow[]>(),
  ]);

  const ownLogs = ownLogsRaw ?? [];

  const topDrinkRows = (topDrinksRaw ?? []) as TopDrinkRow[];

const topDrinks: TopDrink[] = topDrinkRows.map((d) => ({
    drinkId: d.drink_id,
    drinkName: d.drink_name,
    category: d.category,
    avgRating: d.avg_rating,
    ratingCount: d.rating_count,
  }));

  // Signed URLs for the user's own photos here, the same batching
  // pattern already used on Dashboard and Passport, one call for
  // everything rather than one per photo.
  const photoPaths = ownLogs.map((l) => l.photo_url).filter((p): p is string => !!p);
  const signedUrlByPath = new Map<string, string>();
  if (photoPaths.length > 0) {
    const { data: signed } = await supabase.storage.from("drink-photos").createSignedUrls(photoPaths, 3600);
    signed?.forEach((s) => {
      if (s.signedUrl && !s.error) signedUrlByPath.set(s.path ?? "", s.signedUrl);
    });
  }

  const historyLogs: LogCardData[] = ownLogs.map((l) => ({
    id: l.id,
    shopId: shop.id,
    shopName: shop.name,
    drinkName: l.drink?.name ?? "Unknown drink",
    beverageCategory: l.beverage_category,
    drinkRating: l.drink_rating,
    shopRating: l.shop_rating,
    caption: l.caption,
    photoUrl: l.photo_url ? signedUrlByPath.get(l.photo_url) ?? null : null,
    photoPath: l.photo_url,
    price: l.price,
    size: l.size,
    temperature: l.temperature,
    createdAt: l.created_at,
    loggedAt: l.logged_at,
  }));

  // "Your Passport here": a small, already-filtered (one user, one
  // shop) dataset, aggregated in JS exactly the way Passport's own
  // favorites logic already does, this is not the large cross-user
  // aggregation the RPCs above exist to avoid doing client-side.
  let stats: YourPassportStats | null = null;
  if (ownLogs.length > 0) {
    const avgOwnRating =
      Math.round((ownLogs.reduce((sum, l) => sum + l.shop_rating, 0) / ownLogs.length) * 10) / 10;

    const drinkAgg = new Map<string, { name: string; count: number; ratingSum: number }>();
    for (const l of ownLogs) {
      const key = l.drink?.id ?? "unknown";
      const name = l.drink?.name ?? "Unknown drink";
      const existing = drinkAgg.get(key);
      if (existing) {
        existing.count += 1;
        existing.ratingSum += l.drink_rating;
      } else {
        drinkAgg.set(key, { name, count: 1, ratingSum: l.drink_rating });
      }
    }
    const favorite = [...drinkAgg.values()].sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      const avgA = a.ratingSum / a.count;
      const avgB = b.ratingSum / b.count;
      if (avgB !== avgA) return avgB - avgA;
      return a.name.localeCompare(b.name);
    })[0];

    stats = {
      logCount: ownLogs.length,
      avgOwnRating,
      // Already ordered newest-first by the query above.
      mostRecentLoggedAt: ownLogs[0].logged_at,
      favoriteDrinkName: favorite?.name ?? null,
    };
  }

  return (
    <div className="min-h-screen bg-crema pb-24 sm:pb-10">
      <AuthenticatedHeader />

      <main className="container max-w-5xl space-y-8 py-6 sm:space-y-10 sm:py-10">
        <ShopHero
          shop={shop}
          avgRating={ratingSummary?.avg_rating ?? null}
          ratingCount={ratingSummary?.rating_count ?? 0}
        />

        <TopDrinks drinks={topDrinks} shopId={shop.id} />

        <YourPassportHere initialLogs={historyLogs} stats={stats} />
      </main>
    </div>
  );
}
