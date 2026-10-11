import { PolicyLayout } from "@/presentation/components/legal/policy-layout";
import { PricingEnterprise } from "./pricing-enterprise";
import { PricingPlans } from "./pricing-plans";

// Public plan list, moved off the landing page.
export default function PricingPage() {
  return (
    <PolicyLayout>
      <PricingPlans />
      <PricingEnterprise />
    </PolicyLayout>
  );
}
