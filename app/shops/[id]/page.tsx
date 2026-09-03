import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import type { Shop, BeverageCategory, Temperature } from "@/lib/supabase/types";
import { AuthenticatedHeader } from "@/components/dashboard/authenticated-header";
import { ShopHero } from "@/components/shops/shop-hero";
import { TopDrinks, type TopDrink } from "@/components/shops/top-drinks";
import { WhatPeopleAreDrinking, type ShopActivityItem } from "@/components/shops/what-people-are-drinking";
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
  photo_position_x: number | null;
  photo_position_y: number | null;
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

interface ShopActivityRow {
  log_id: string;
  logged_at: string;
  drink_rating: number;
  caption: string | null;
  temperature: Temperature | null;
  photo_path: string | null;
  photo_position_x: number | null;
  photo_position_y: number | null;
  drink_id: string;
  drink_name: string;
  category: BeverageCategory;
  username: string | null;
  first_name: string | null;
  avatar_url: string | null;
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

  const [{ data: ratingSummary }, { data: topDrinksData }, { data: ownLogsRaw }, { data: activityData }] =
    await Promise.all([
      supabase.rpc("get_shop_rating_summary", { target_shop_id: id }).maybeSingle<RatingSummaryRow>(),
      supabase.rpc("get_shop_top_drinks", { target_shop_id: id, result_limit: 10 }),
      supabase
        .from("drink_logs")
        .select(
          "id, drink_rating, shop_rating, caption, photo_url, photo_position_x, photo_position_y, price, size, temperature, beverage_category, created_at, logged_at, drink:drinks(id,name)"
        )
        .eq("shop_id", id)
        .eq("user_id", user.id)
        .order("logged_at", { ascending: false })
        .order("created_at", { ascending: false })
        .returns<OwnLogRow[]>(),
      supabase.rpc("get_shop_public_activity", { target_shop_id: id, result_limit: 12 }),
    ]);

  // RPC results are cast after the fact rather than chaining
  // .returns<T[]>() onto the rpc() call itself, that chained pattern
  // has previously caused a TypeScript build failure with this
  // Supabase client version.
  const topDrinksRaw = (topDrinksData ?? []) as TopDrinkRow[];
  const activityRaw = (activityData ?? []) as ShopActivityRow[];

  const ownLogs = ownLogsRaw ?? [];

  const topDrinks: TopDrink[] = (topDrinksRaw ?? []).map((d) => ({
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

  const activity = activityRaw ?? [];

  // Separate, short-lived (5 minute) signed URLs for public activity
  // photos, these belong to other people's public logs, not this
  // viewer's own, the short TTL limits exposure if one of them flips
  // to private shortly after this page renders.
  const activityPhotoPaths = activity.map((a) => a.photo_path).filter((p): p is string => !!p);
  const activitySignedUrlByPath = new Map<string, string>();
  if (activityPhotoPaths.length > 0) {
    const { data: signed } = await supabase.storage
      .from("drink-photos")
      .createSignedUrls(activityPhotoPaths, 5 * 60);
    signed?.forEach((s) => {
      if (s.signedUrl && !s.error) activitySignedUrlByPath.set(s.path ?? "", s.signedUrl);
    });
  }

  const activityItems: ShopActivityItem[] = activity.map((a) => ({
    logId: a.log_id,
    loggedAt: a.logged_at,
    drinkRating: a.drink_rating,
    caption: a.caption,
    temperature: a.temperature,
    photoUrl: a.photo_path ? activitySignedUrlByPath.get(a.photo_path) ?? null : null,
    photoPositionX: a.photo_position_x,
    photoPositionY: a.photo_position_y,
    drinkName: a.drink_name,
    category: a.category,
    username: a.username,
    firstName: a.first_name,
    avatarUrl: a.avatar_url,
  }));

  const historyLogs: LogCardData[] = ownLogs.map((l) => ({
    id: l.id,
    shopId: shop.id,
    shopName: shop.name,
    shopCity: shop.city,
    shopState: shop.state,
    drinkName: l.drink?.name ?? "Unknown drink",
    beverageCategory: l.beverage_category,
    drinkRating: l.drink_rating,
    shopRating: l.shop_rating,
    caption: l.caption,
    photoUrl: l.photo_url ? signedUrlByPath.get(l.photo_url) ?? null : null,
    photoPath: l.photo_url,
    photoPositionX: l.photo_position_x,
    photoPositionY: l.photo_position_y,
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

        <WhatPeopleAreDrinking items={activityItems} />

        <YourPassportHere initialLogs={historyLogs} stats={stats} />
      </main>
    </div>
  );
}
