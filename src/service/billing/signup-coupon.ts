import type Stripe from "stripe";

// Stable Stripe coupon id so checkout reuses one forever-duration coupon.
export function signupCouponId(percent: number) {
  return `scro_signup_${percent}`;
}

// Create the coupon the first time a locked-in account checks out.
export async function ensureSignupCoupon(stripe: Stripe, percent: number) {
  const id = signupCouponId(percent);
  try {
    const existing = await stripe.coupons.retrieve(id);
    if (!("deleted" in existing && existing.deleted) && existing.percent_off === percent) {
      return id;
    }
  } catch {
    // Missing coupon. Create it below.
  }
  await stripe.coupons.create({
    id,
    percent_off: percent,
    duration: "forever",
    name: `Scro signup ${percent}% off`,
  });
  return id;
}
