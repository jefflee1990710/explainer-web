import { creditProgress } from "@/lib/billing/credit-balance";

export function CreditProgress({
  credits,
  creditLimit,
  monthlyCredits,
  bonusCredits,
  periodEnd,
}: {
  credits: number;
  creditLimit: number;
  monthlyCredits: number;
  bonusCredits: number;
  periodEnd?: Date;
}) {
  const limit = Math.max(creditLimit, monthlyCredits, credits);
  const { remaining, ratio } = creditProgress(credits, limit);
  const percent = Math.round(ratio * 100);

  return (
    <section className="mt-6 rounded-[1.5rem] border border-accent-ink/10 bg-paper/85 p-6 shadow-[6px_6px_0_0_rgba(18,20,28,0.08)]">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
        本週期 credits
      </p>
      <p className="font-display mt-2 text-3xl font-bold">
        {remaining}
        <span className="text-lg font-medium text-muted"> / {limit}</span>
      </p>
      <div
        className="mt-4 h-3 overflow-hidden rounded-full bg-accent-ink/10"
        role="progressbar"
        aria-label="剩餘 credits"
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={remaining}
      >
        <div
          className="h-full rounded-full bg-lime transition-[width] duration-200 motion-reduce:transition-none"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-3 text-sm text-muted">
        剩餘 {remaining} credits
        {monthlyCredits > 0 ? ` · 每月額度 ${monthlyCredits}` : ""}
        {bonusCredits > 0 ? ` · 加購未用 ${bonusCredits}` : ""}
        {periodEnd
          ? ` · 週期至 ${periodEnd.toLocaleDateString("zh-Hant")}`
          : ""}
      </p>
      <p className="mt-1 text-xs text-muted">
        每段 clip 扣 3 credits（分鏡圖 2 + 產片 1）。加購未用完的額度會留到下個週期。
      </p>
    </section>
  );
}
