"use client";

import { useI18n } from "@/presentation/components/i18n-provider";

/** Free / unsubscribed tier card shown beside monthly plans. */
export function PayAsYouGoCard() {
  const { t } = useI18n();
  return (
    <article className="flex flex-col rounded-[1.5rem] border border-accent-ink/10 bg-paper/85 p-6 shadow-[6px_6px_0_0_rgba(18,20,28,0.08)]">
      <h3 className="font-display text-xl font-bold">{t("billing.payAsYouGoName")}</h3>
      <p className="mt-2 font-display text-3xl font-bold">
        $0
        <span className="text-base font-medium text-muted"> {t("common.perMonth")}</span>
      </p>
      <p className="mt-2 flex-1 text-sm text-muted">{t("billing.payAsYouGoBlurb")}</p>
      <p className="mt-4 text-xs text-muted">{t("billing.payAsYouGoFooter")}</p>
    </article>
  );
}
