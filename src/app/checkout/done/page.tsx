import { Suspense } from "react";
import { CheckoutDone } from "@/presentation/components/app/billing/checkout-done";

export default function CheckoutDonePage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-dvh place-items-center text-sm text-muted">
          正在回到 Scro…
        </div>
      }
    >
      <CheckoutDone />
    </Suspense>
  );
}
