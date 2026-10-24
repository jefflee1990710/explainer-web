import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckoutDone } from "@/presentation/components/app/billing/checkout-done";
import { CheckoutReturningWait } from "@/presentation/components/app/billing/checkout-returning-wait";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function CheckoutDonePage() {
  return (
    <Suspense
      fallback={<CheckoutReturningWait />}
    >
      <CheckoutDone />
    </Suspense>
  );
}
