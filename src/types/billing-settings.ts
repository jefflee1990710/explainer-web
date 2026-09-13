// Singleton billing config persisted after Stripe products are created.
export type BillingSettings = {
  _id: "billing";
  starterPriceId: string;
  proPriceId: string;
  starterProductId: string;
  proProductId: string;
  updatedAt: Date;
};
