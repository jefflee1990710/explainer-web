import { PolicyLayout } from "@/presentation/components/legal/policy-layout";
import { getAuthSession } from "@/service/auth";
import { marketingPageMetadata } from "@/util/i18n/marketing-page-meta";
import { ExplainerCta } from "./explainer-cta";
import { ExplainerFlow } from "./explainer-flow";
import { ExplainerHero } from "./explainer-hero";
import { ExplainerStyle } from "./explainer-style";
import { ExplainerUses } from "./explainer-uses";

export const generateMetadata = () => marketingPageMetadata("explainerPage");

// Marketing: explainer director + whiteboard style for product concepts.
export default async function ExplainerMarketingPage() {
  const session = await getAuthSession();
  const signedIn = Boolean(session);
  return (
    <PolicyLayout>
      <ExplainerHero signedIn={signedIn} />
      <ExplainerStyle />
      <ExplainerUses />
      <ExplainerFlow />
      <ExplainerCta signedIn={signedIn} />
    </PolicyLayout>
  );
}
