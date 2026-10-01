import { Suspense } from "react";
import { CheckoutDone } from "@/presentation/components/app/billing/checkout-done";
import { CheckoutReturningWait } from "@/presentation/components/app/billing/checkout-returning-wait";

export default function CheckoutDonePage() {
  return (
    <Suspense
      fallback={<CheckoutReturningWait />}
    >
      <CheckoutDone />
    </Suspense>
  );
}
