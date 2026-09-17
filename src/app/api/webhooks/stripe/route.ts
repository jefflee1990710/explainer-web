import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/billing/stripe";
import {
  grantCreditsFromInvoice,
  grantPackFromCheckout,
  syncStripeSubscription,
} from "@/lib/billing/sync-subscription";

export async function POST(request: Request) {
  const stripe = getStripe();
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;
  try {
    if (secret && signature) {
      event = stripe.webhooks.constructEvent(body, signature, secret);
    } else {
      event = JSON.parse(body) as Stripe.Event;
    }
  } catch {
    return NextResponse.json({ error: "Invalid Stripe payload" }, { status: 400 });
  }

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await syncStripeSubscription(event.data.object as Stripe.Subscription);
      break;
    case "invoice.paid":
      await grantCreditsFromInvoice(event.data.object as Stripe.Invoice);
      break;
    case "checkout.session.completed":
      await grantPackFromCheckout(event.data.object as Stripe.Checkout.Session);
      break;
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
