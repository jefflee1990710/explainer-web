"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { CHECKOUT_MESSAGE_TYPE } from "@/presentation/components/app/billing/checkout-popup";
import { useI18n } from "@/presentation/components/i18n-provider";

// Popup return from Stripe. Tell the opener and close; fall back to billing.
export function CheckoutDone() {
  const { t } = useI18n();
  const params = useSearchParams();
  const status = params.get("checkout") === "cancel" ? "cancel" : "success";

  useEffect(() => {
    if (window.opener) {
      window.opener.postMessage(
        { type: CHECKOUT_MESSAGE_TYPE, status },
        window.location.origin,
      );
      window.close();
      return;
    }
    const next =
      status === "success" ? "/app/billing?checkout=success" : "/app/billing?checkout=cancel";
    window.location.replace(next);
  }, [status]);

  return (
    <div className="grid min-h-dvh place-items-center px-6 text-center text-sm text-muted">
      {status === "success" ? t("billing.checkoutReturningSuccess") : t("billing.checkoutReturningCancel")}
    </div>
  );
}
