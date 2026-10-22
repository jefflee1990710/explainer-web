import { PolicyLayout } from "@/presentation/components/legal/policy-layout";
import { getAuthSession } from "@/service/auth";
import { marketingPageMetadata } from "@/util/i18n/marketing-page-meta";
import { CantoneseCta } from "./cantonese-cta";
import { CantoneseFit } from "./cantonese-fit";
import { CantoneseFlow } from "./cantonese-flow";
import { CantoneseHero } from "./cantonese-hero";

export const generateMetadata = () => marketingPageMetadata("cantonesePage");

// Marketing: HK Cantonese talking-heads for SME / solo founders.
export default async function CantoneseMarketingPage() {
  const session = await getAuthSession();
  const signedIn = Boolean(session);
  return (
    <PolicyLayout>
      <CantoneseHero signedIn={signedIn} />
      <CantoneseFit signedIn={signedIn} />
      <CantoneseFlow signedIn={signedIn} />
      <CantoneseCta signedIn={signedIn} />
    </PolicyLayout>
  );
}
