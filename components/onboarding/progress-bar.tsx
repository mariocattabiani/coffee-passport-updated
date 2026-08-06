interface ProgressBarProps {
  step: number; // 0-indexed
  totalSteps: number;
}

export function ProgressBar({ step, totalSteps }: ProgressBarProps) {
  return (
    <div className="w-full">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-charcoal/40">
        Step {step + 1} of {totalSteps}
      </p>
      <div className="flex gap-1.5">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
              i <= step ? "bg-espresso" : "bg-espresso/10"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
