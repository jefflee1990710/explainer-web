import { PolicyLayout } from "@/presentation/components/legal/policy-layout";
import { getAuthSession } from "@/service/auth";
import { marketingPageMetadata } from "@/util/i18n/marketing-page-meta";
import { TalkingHeadCta } from "./talking-head-cta";
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
      <TalkingHeadHero signedIn={signedIn} />
      <TalkingHeadSteps />
      <TalkingHeadFinish />
      <TalkingHeadCta signedIn={signedIn} />
    </PolicyLayout>
  );
}
