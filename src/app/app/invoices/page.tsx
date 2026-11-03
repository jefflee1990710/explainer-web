import { requireAppUser } from "@/service/auth";
import { listCustomerInvoicesAndPayments } from "@/service/billing/customer-billing";
import { InvoicesView } from "@/presentation/components/app/billing/invoices-view";

export default async function InvoicesPage() {
  const user = await requireAppUser();
  const { records, totalPaidUsd } = await listCustomerInvoicesAndPayments(
    user.stripeCustomerId,
  );

  return (
    <InvoicesView
      records={records}
      totalPaidUsd={totalPaidUsd}
      hasStripeCustomer={Boolean(user.stripeCustomerId)}
    />
  );
}
