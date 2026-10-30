import { PolicyLayout } from "@/presentation/components/legal/policy-layout";
import { StudioPowertoolsBand } from "@/presentation/components/studio-powertools-band";
import { getAuthSession } from "@/service/auth";
import { MarketingPageJsonLd } from "@/presentation/components/seo/public-page-json-ld";
import { marketingPageMetadata } from "@/util/i18n/marketing-page-meta";
import { CantoneseCta } from "./cantonese-cta";
import { CantoneseExamples } from "./cantonese-examples";
import { CantonesePost } from "./cantonese-post";
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
      <MarketingPageJsonLd pageKey="cantonesePage" />
      <CantoneseHero signedIn={signedIn} />
      <CantoneseFit signedIn={signedIn} />
      <CantoneseFlow signedIn={signedIn} />
      <StudioPowertoolsBand signedIn={signedIn} />
      <CantoneseExamples />
      <CantonesePost />
      <CantoneseCta signedIn={signedIn} />
    </PolicyLayout>
  );
}
