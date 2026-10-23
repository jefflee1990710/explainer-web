import { PolicyLayout } from "@/presentation/components/legal/policy-layout";
import { getAuthSession } from "@/service/auth";
import { PricingEnterprise } from "./pricing-enterprise";
import { PricingPlans } from "./pricing-plans";

// Public plan list. Signed-in visitors subscribe from billing; everyone else starts at sign-up.
export default async function PricingPage() {
  const session = await getAuthSession();
  return (
    <PolicyLayout>
      <PricingPlans signedIn={Boolean(session)} />
      <PricingEnterprise />
    </PolicyLayout>
  );
}
