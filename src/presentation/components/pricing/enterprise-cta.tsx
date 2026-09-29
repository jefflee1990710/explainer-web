"use client";

import { ENTERPRISE, salesMailto } from "@/service/billing/plans";

// Shared enterprise CTA used on landing and billing.
export function EnterpriseCta({
  className = "",
  compact = false,
  imageSrc,
}: {
  className?: string;
  compact?: boolean;
  imageSrc?: string;
}) {
  return (
    <article
      className={`flex h-full flex-col rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-8 ${className}`}
    >
      {imageSrc ? (
        <div className="-mx-8 -mt-8 mb-6 h-44 overflow-hidden rounded-t-2xl bg-white">
          <img src={imageSrc} alt="" className="h-full w-full object-cover object-center" />
        </div>
      ) : null}
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
        className={`mt-7 inline-flex min-h-[44px] w-fit items-center rounded-full border border-zinc-300 bg-white px-5 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100 ${
          compact ? "py-2" : "py-2.5"
        }`}
      >
        聯絡我們
      </a>
    </article>
  );
}
