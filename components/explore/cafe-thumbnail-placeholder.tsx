import { Coffee } from "lucide-react";

interface CafeThumbnailPlaceholderProps {
  name: string;
  size?: "sm" | "md";
}

// Warm, brand-palette gradients only (espresso/latte/sage/crema) — no
// new colors introduced. Picked deterministically from the café's own
// name (a simple string hash), not randomly, so the same café always
// gets the same tile rather than flickering between renders/reloads,
// while different cafés in the same list still read as visually
// varied instead of one repeated flat swatch.
const GRADIENTS = [
  "from-espresso to-latte",
  "from-sage to-espresso",
  "from-latte to-sage",
  "from-espresso via-latte to-sage",
];

function gradientForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return GRADIENTS[hash % GRADIENTS.length];
}

/**
 * Replaces the old flat gray/tan box + generic icon used across
 * ResultCard, ExternalResultCard, and MapCafePreview whenever a café
 * has no real photo. A gradient tile plus the café's own first letter
 * is both more colorful/alive and genuinely more useful for scanning
 * a list than a repeated identical icon — different cafés are visually
 * distinguishable at a glance, not just "this one has no photo".
 * A real photo, when one exists, always takes priority — this
 * component is only ever rendered in the no-photo branch at each call
 * site, never layered under or racing against a real image.
 */
export function CafeThumbnailPlaceholder({ name, size = "md" }: CafeThumbnailPlaceholderProps) {
  const dims = size === "sm" ? "h-14 w-14" : "h-16 w-16";
  const initial = name.trim().charAt(0).toUpperCase() || "C";
  const gradient = gradientForName(name);

  return (
    <div
      className={`relative flex ${dims} shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br ${gradient}`}
      aria-hidden="true"
    >
      <span className="font-heading text-lg font-semibold text-crema/90">{initial}</span>
      <Coffee
        className="absolute -bottom-1.5 -right-1.5 h-6 w-6 rotate-12 text-crema/20"
        strokeWidth={1.5}
      />
    </div>
  );
}
