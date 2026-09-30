import { getAppUrl } from "@/util/app-url";

export type CheckoutKind = { planId: string } | { packId: string };

export type CheckoutUrls = {
  success_url: string;
  cancel_url: string;
};

// Popup checkout returns to a tiny done page that messages the opener.
// Full-page checkout still lands on billing.
export function checkoutUrls(kind: CheckoutKind, popup = false): CheckoutUrls {
  const app = getAppUrl();
  const extra = "planId" in kind ? `plan=${kind.planId}` : `pack=${kind.packId}`;
  if (popup) {
    return {
      success_url: `${app}/checkout/done?checkout=success&${extra}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${app}/checkout/done?checkout=cancel`,
    };
  }
  return {
    success_url: `${app}/app/billing?checkout=success&${extra}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${app}/app/billing?checkout=cancel`,
  };
}
