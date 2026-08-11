import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: LucideIcon;
  value: number;
  label: string;
  tint: "espresso" | "latte" | "sage" | "gold";
  secondary?: string;
}

const TINTS: Record<StatCardProps["tint"], { bg: string; badge: string }> = {
  espresso: { bg: "bg-espresso/[0.05]", badge: "bg-espresso text-crema" },
  latte: { bg: "bg-latte/[0.18]", badge: "bg-latte text-espresso" },
  sage: { bg: "bg-sage/[0.10]", badge: "bg-sage text-crema" },
  gold: { bg: "bg-gold/[0.12]", badge: "bg-gold text-espresso" },
};

export function StatCard({ icon: Icon, value, label, tint, secondary }: StatCardProps) {
  const t = TINTS[tint];
  return (
    <div className={cn("rounded-xl border border-border/60 p-4 shadow-soft sm:p-5", t.bg)}>
      <div className={cn("flex h-9 w-9 items-center justify-center rounded-full", t.badge)}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-3 font-heading text-2xl font-semibold text-espresso sm:text-3xl">{value}</p>
      <p className="text-xs text-charcoal/60 sm:text-sm">{label}</p>
      {secondary && <p className="mt-1 text-xs font-medium text-sage">{secondary}</p>}
    </div>
  );
}
