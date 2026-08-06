import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-white/60 px-6 py-10 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-espresso/5">
        <Icon className="h-5 w-5 text-espresso/50" />
      </div>
      <p className="mt-4 text-sm font-medium text-charcoal">{title}</p>
      <p className="mt-1 max-w-[220px] text-xs text-charcoal/50">{description}</p>
    </div>
  );
}
