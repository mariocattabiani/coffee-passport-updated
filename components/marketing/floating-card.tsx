import { cn } from "@/lib/utils";

interface FloatingCardProps {
  children: React.ReactNode;
  className?: string;
}

export function FloatingCard({ children, className }: FloatingCardProps) {
  return (
    <div
      className={cn(
        "absolute rounded-lg bg-white/95 p-3.5 shadow-card backdrop-blur-sm",
        className
      )}
    >
      {children}
    </div>
  );
}
