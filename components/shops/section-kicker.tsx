interface SectionKickerProps {
  label: string;
  tone?: "sage" | "gold";
}

/** A small uppercase label with a short rule, used above section
 *  headings on the shop page to give each section its own quiet
 *  editorial marker instead of a plain heading with no lead-in. */
export function SectionKicker({ label, tone = "sage" }: SectionKickerProps) {
  const color = tone === "gold" ? "text-gold" : "text-sage";
  const ruleColor = tone === "gold" ? "bg-gold/60" : "bg-sage/50";

  return (
    <p className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] ${color}`}>
      <span className={`h-px w-5 ${ruleColor}`} aria-hidden="true" />
      {label}
    </p>
  );
}
