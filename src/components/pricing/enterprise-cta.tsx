"use client";

import { ENTERPRISE, salesMailto } from "@/lib/billing/plans";

// Shared enterprise CTA used on landing and billing.
export function EnterpriseCta({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <article
      className={`flex h-full flex-col rounded-[1.75rem] border border-dashed border-accent-ink/25 bg-paper/70 p-7 ${className}`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
        Enterprise
      </p>
      <h3 className="font-display mt-2 text-2xl font-bold">
        {ENTERPRISE.nameZh} / {ENTERPRISE.name}
      </h3>
      <p className="mt-3 font-display text-3xl font-bold">報價</p>
      <p className="mt-3 flex-1 text-sm leading-6 text-muted">{ENTERPRISE.blurb}</p>
      <a
        href={salesMailto()}
        className={`mt-7 inline-flex min-h-[44px] w-fit items-center rounded-full border border-accent-ink/20 bg-paper px-5 text-sm font-semibold shadow-[3px_3px_0_0_rgba(18,20,28,0.08)] transition hover:-translate-y-0.5 ${
          compact ? "py-2" : "py-2.5"
        }`}
      >
        聯絡我們
      </a>
    </article>
  );
}
