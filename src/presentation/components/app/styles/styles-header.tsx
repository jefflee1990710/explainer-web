"use client";

import { useI18n } from "@/presentation/components/i18n-provider";

// Page title and short explainer for the style library.
export function StylesHeader() {
  const { t } = useI18n();

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-3xl font-bold">{t("styles.title")}</h1>
        <p className="mt-2 text-sm text-muted">{t("styles.subtitle")}</p>
      </div>
    </div>
  );
}
