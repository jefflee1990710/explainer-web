import { CREDIT_PACKS, isPackId } from "@/service/billing/packs";
import { isPlanId, PLANS } from "@/service/billing/plans";
import { getStripe } from "@/service/billing/stripe";

export type SavedPaymentCard = {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
};

export type CustomerInvoiceRecord = {
  id: string;
  createdAt: string;
  description: string;
  amountPaidUsd: number;
  currency: string;
  status: string;
  invoiceNumber?: string | null;
  hostedUrl?: string | null;
  pdfUrl?: string | null;
  kind: "subscription" | "topup";
};

/** Fetch saved credit cards on the user's Stripe customer profile. */
export async function listCustomerPaymentCards(
  stripeCustomerId?: string | null,
): Promise<SavedPaymentCard[]> {
  if (!stripeCustomerId || !process.env.STRIPE_SECRET_KEY) return [];
  try {
    const stripe = getStripe();
    const [customer, paymentMethods] = await Promise.all([
      stripe.customers.retrieve(stripeCustomerId),
      stripe.paymentMethods.list({
        customer: stripeCustomerId,
        type: "card",
        limit: 10,
      }),
    ]);

    const defaultPmId =
      !customer.deleted &&
      customer.invoice_settings?.default_payment_method
        ? typeof customer.invoice_settings.default_payment_method === "string"
          ? customer.invoice_settings.default_payment_method
          : customer.invoice_settings.default_payment_method.id
        : null;

    return paymentMethods.data.map((pm, index) => ({
      id: pm.id,
      brand: (pm.card?.brand || "card").toUpperCase(),
      last4: pm.card?.last4 || "••••",
      expMonth: pm.card?.exp_month || 1,
      expYear: pm.card?.exp_year || 2030,
      isDefault: defaultPmId ? pm.id === defaultPmId : index === 0,
    }));
  } catch (error) {
    console.error("[billing] listCustomerPaymentCards failed", error);
    return [];
  }
}

/**
 * Fetch all paid/open invoices and one-time credit pack payments for a Stripe customer,
 * sorted newest first, plus total USD paid.
 */
export async function listCustomerInvoicesAndPayments(
  stripeCustomerId?: string | null,
): Promise<{
  records: CustomerInvoiceRecord[];
  totalPaidUsd: number;
}> {
  if (!stripeCustomerId || !process.env.STRIPE_SECRET_KEY) {
    return { records: [], totalPaidUsd: 0 };
  }

  try {
    const stripe = getStripe();
    const [invoices, sessions] = await Promise.all([
      stripe.invoices.list({
        customer: stripeCustomerId,
        limit: 40,
      }),
      stripe.checkout.sessions.list({
        customer: stripeCustomerId,
        limit: 40,
      }),
    ]);

    const records: CustomerInvoiceRecord[] = [];
    const seenSessionPaymentIntents = new Set<string>();

    for (const inv of invoices.data) {
      if (inv.status === "draft" || inv.status === "void") continue;
      const amountUsd = Math.round(((inv.amount_paid || inv.amount_due || 0) / 100) * 100) / 100;
      const firstLine = inv.lines?.data?.[0];
      const desc =
        firstLine?.description ||
        inv.description ||
        "Scro Subscription Invoice";

      records.push({
        id: inv.id,
        createdAt: new Date(inv.created * 1000).toISOString(),
        description: desc,
        amountPaidUsd: inv.status === "paid" ? amountUsd : 0,
        currency: (inv.currency || "usd").toUpperCase(),
        status: inv.status || "open",
        invoiceNumber: inv.number,
        hostedUrl: inv.hosted_invoice_url,
        pdfUrl: inv.invoice_pdf,
        kind: "subscription",
      });
    }

    // Include one-time Checkout Sessions (`mode: "payment"`) for credit pack top-ups
    for (const sess of sessions.data) {
      if (sess.mode !== "payment" || sess.payment_status !== "paid") continue;
      const piId =
        typeof sess.payment_intent === "string"
          ? sess.payment_intent
          : sess.payment_intent?.id;
      if (piId) seenSessionPaymentIntents.add(piId);

      const packId = sess.metadata?.packId;
      const planId = sess.metadata?.planId;
      const creditsMeta = sess.metadata?.credits;
      let description = "Credits Top-up";
      if (isPackId(packId)) {
        const pack = CREDIT_PACKS[packId];
        description = `${pack.nameZh} (${creditsMeta || pack.credits} credits)`;
      } else if (isPlanId(planId)) {
        description = `Scro ${PLANS[planId].name}`;
      } else if (creditsMeta) {
        description = `Top-up · ${creditsMeta} credits`;
      }

      const amountPaidUsd =
        Math.round(((sess.amount_total || 0) / 100) * 100) / 100;

      records.push({
        id: sess.id,
        createdAt: new Date(sess.created * 1000).toISOString(),
        description,
        amountPaidUsd,
        currency: (sess.currency || "usd").toUpperCase(),
        status: "paid",
        invoiceNumber: sess.id.slice(-8).toUpperCase(),
        hostedUrl: null,
        pdfUrl: null,
        kind: "topup",
      });
    }

    records.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const totalPaidUsd =
      Math.round(
        records.reduce((sum, r) => sum + (r.status === "paid" ? r.amountPaidUsd : 0), 0) * 100,
      ) / 100;

    return { records, totalPaidUsd };
  } catch (error) {
    console.error("[billing] listCustomerInvoicesAndPayments failed", error);
    return { records: [], totalPaidUsd: 0 };
  }
}
