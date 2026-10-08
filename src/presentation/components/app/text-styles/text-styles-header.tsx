"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { CreateTextStyleButton } from "@/presentation/components/app/text-styles/create-text-style-dialog";

// Title for the text-style library, with the upload action beside it.
export function TextStylesHeader() {
  const { t } = useI18n();

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-3xl font-bold">{t("textStyles.title")}</h1>
        <p className="mt-2 text-sm text-muted">{t("textStyles.subtitle")}</p>
      </div>
      <CreateTextStyleButton />
    </div>
  );
}
