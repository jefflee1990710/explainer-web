"use client";

import { useI18n } from "@/presentation/components/i18n-provider";

/** Free / unsubscribed tier card shown beside monthly plans. */
export function PayAsYouGoCard({ className = "" }: { className?: string }) {
  const { t } = useI18n();
  return (
    <article
      className={`flex flex-col overflow-hidden rounded-[1.5rem] border border-[var(--studio-line)] bg-[var(--studio-panel)] text-[var(--studio-ink)] ${className}`}
    >
      <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden border-b border-[var(--studio-line)] bg-[#12141c]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/pricing/payg-scro.png"
          alt={t("billing.payAsYouGoName")}
          loading="lazy"
          className="h-full w-full object-cover object-center transition duration-300 hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="font-display text-xl font-bold">{t("billing.payAsYouGoName")}</h3>
        <p className="mt-2 font-display text-3xl font-bold">
          $0
          <span className="text-base font-medium text-muted"> {t("common.perMonth")}</span>
        </p>
        <p className="mt-2 flex-1 text-sm text-muted">{t("billing.payAsYouGoBlurb")}</p>
        <p className="mt-4 text-xs text-muted">{t("billing.payAsYouGoFooter")}</p>
      </div>
    </article>
  );
}
