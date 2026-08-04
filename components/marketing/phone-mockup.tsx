import { cn } from "@/lib/utils";

interface PhoneMockupProps {
  children: React.ReactNode;
  className?: string;
}

export function PhoneMockup({ children, className }: PhoneMockupProps) {
  return (
    <div
      className={cn(
        "relative mx-auto w-[280px] rounded-[2.5rem] border-[6px] border-espresso bg-espresso shadow-[0_30px_60px_-15px_rgba(43,20,10,0.35)] sm:w-[300px]",
        className
      )}
    >
      {/* notch */}
      <div className="absolute left-1/2 top-0 z-20 h-5 w-28 -translate-x-1/2 rounded-b-2xl bg-espresso" />
      <div className="relative h-[560px] overflow-hidden rounded-[2rem] bg-crema">
        {/* status bar */}
        <div className="flex items-center justify-between px-6 pb-1 pt-3 text-[11px] font-medium text-charcoal/70">
          <span>9:41</span>
          <div className="flex items-center gap-1">
            <div className="h-2.5 w-4 rounded-sm border border-charcoal/40" />
          </div>
        </div>
        <div className="h-[calc(100%-32px)] overflow-hidden">{children}</div>
      </div>
      {/* home indicator */}
      <div className="absolute bottom-2 left-1/2 h-1 w-24 -translate-x-1/2 rounded-full bg-charcoal/20" />
    </div>
  );
}
