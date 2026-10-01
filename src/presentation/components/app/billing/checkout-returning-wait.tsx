"use client";

import { useI18n } from "@/presentation/components/i18n-provider";

export function CheckoutReturningWait() {
  const { t } = useI18n();
  return (
    <div className="grid min-h-dvh place-items-center text-sm text-muted">
      {t("billing.checkoutReturningWait")}
    </div>
  );
}
