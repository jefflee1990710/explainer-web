"use client";

import Link from "next/link";
import { useI18n } from "@/presentation/components/i18n-provider";
import { ENTERPRISE } from "@/service/billing/plans";

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
  const { t, locale } = useI18n();
  const heading =
    locale === "zh-Hant"
      ? `${ENTERPRISE.nameZh} / ${ENTERPRISE.name}`
      : locale === "zh-Hans"
        ? `企业 / ${ENTERPRISE.name}`
        : ENTERPRISE.name;

  return (
    <article
      className={`flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-dashed border-[var(--studio-line)] bg-[var(--studio-panel)] text-[var(--studio-ink)] ${className}`}
    >
      {imageSrc ? (
        <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden border-b border-[var(--studio-line)] bg-[#12141c]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt={heading}
            loading="lazy"
            className="h-full w-full object-cover object-center transition duration-300 hover:scale-105"
          />
        </div>
      ) : null}
      <div className="flex flex-1 flex-col p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
          {t("landing.enterprise.cardLabel")}
        </p>
        <h3 className="font-display mt-1 text-xl font-bold">{heading}</h3>
        <p className="mt-2 font-display text-3xl font-bold">{t("landing.enterprise.quote")}</p>
        <p className="mt-2 flex-1 text-sm leading-6 text-muted">{t("landing.enterprise.body")}</p>
        <Link
          href="/contact"
          className={`mt-5 inline-flex min-h-[44px] w-fit items-center rounded-full border border-[var(--studio-line)] bg-[var(--studio-fill)] px-5 text-sm font-semibold text-[var(--studio-ink)] transition hover:border-[#c6f24b] ${
            compact ? "py-2" : "py-2.5"
          }`}
        >
          {t("landing.enterprise.cta")}
        </Link>
      </div>
    </article>
  );
}
