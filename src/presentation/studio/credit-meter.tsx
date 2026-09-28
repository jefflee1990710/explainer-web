import { creditsUsed } from "@/service/billing/credit-balance";

// Compact header meter. The track fills with credits already spent this period.
export function CreditMeter({
  credits,
  creditLimit,
  creditsLabel,
  className = "min-w-28 max-sm:hidden",
}: {
  credits: number;
  creditLimit: number;
  creditsLabel: string;
  // Layout/visibility overrides for where the meter is placed.
  className?: string;
}) {
  const { used, limit, ratio } = creditsUsed(credits, creditLimit);
  const percent = Math.round(ratio * 100);
  const hot = ratio >= 0.8;

  return (
    <div
      className={`flex flex-col gap-1 rounded-md border border-[var(--studio-line)] bg-[var(--studio-panel)] px-2.5 py-1 ${className}`}
    >
      <span className="whitespace-nowrap text-xs font-semibold tabular-nums">
        {credits} {creditsLabel}
      </span>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-[var(--studio-line)]"
        role="progressbar"
        aria-label={creditsLabel}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={used}
        title={`${used} / ${limit}`}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-200 motion-reduce:transition-none ${
            hot ? "bg-[var(--accent)]" : "bg-[var(--studio-teal)]"
          }`}
          style={{ width: used === 0 ? "0%" : `max(${percent}%, 6px)` }}
        />
      </div>
    </div>
  );
}
