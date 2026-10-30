import { PolicyLayout } from "@/presentation/components/legal/policy-layout";
import { StudioPowertoolsBand } from "@/presentation/components/studio-powertools-band";
import { getAuthSession } from "@/service/auth";
import { MarketingPageJsonLd } from "@/presentation/components/seo/public-page-json-ld";
import { marketingPageMetadata } from "@/util/i18n/marketing-page-meta";
import { TalkingHeadCta } from "./talking-head-cta";
import { TalkingHeadExamples } from "./talking-head-examples";
import { TalkingHeadPost } from "./talking-head-post";
import { TalkingHeadFinish } from "./talking-head-finish";
import { TalkingHeadHero } from "./talking-head-hero";
import { TalkingHeadSteps } from "./talking-head-steps";

export const generateMetadata = () => marketingPageMetadata("talkingHeadPage");

// Marketing: talking-head + captions, then edit with SFX/BGM.
export default async function TalkingHeadMarketingPage() {
  const session = await getAuthSession();
  const signedIn = Boolean(session);
  return (
    <PolicyLayout>
      <MarketingPageJsonLd pageKey="talkingHeadPage" />
      <TalkingHeadHero signedIn={signedIn} />
      <TalkingHeadSteps signedIn={signedIn} />
      <TalkingHeadFinish signedIn={signedIn} />
      <StudioPowertoolsBand signedIn={signedIn} />
      <TalkingHeadExamples />
      <TalkingHeadPost />
      <TalkingHeadCta signedIn={signedIn} />
    </PolicyLayout>
  );
}
