import { PolicyLayout } from "@/presentation/components/legal/policy-layout";
import { getAuthSession } from "@/service/auth";
import { marketingPageMetadata } from "@/util/i18n/marketing-page-meta";
import { AiInfluencerCta } from "./ai-influencer-cta";
import { AiInfluencerExamples } from "./ai-influencer-examples";
import { AiInfluencerPost } from "./ai-influencer-post";
import { AiInfluencerEarn } from "./ai-influencer-earn";
import { AiInfluencerHero } from "./ai-influencer-hero";
import { AiInfluencerIp } from "./ai-influencer-ip";
import { AiInfluencerShift } from "./ai-influencer-shift";
import { AiInfluencerSoul } from "./ai-influencer-soul";

export const generateMetadata = () => marketingPageMetadata("aiInfluencerPage");

// Marketing: your experience is the soul of an AI Influencer — attention → income.
export default async function AiInfluencerMarketingPage() {
  const session = await getAuthSession();
  const signedIn = Boolean(session);
  return (
    <PolicyLayout>
      <AiInfluencerHero signedIn={signedIn} />
      <AiInfluencerSoul signedIn={signedIn} />
      <AiInfluencerIp />
      <AiInfluencerEarn />
      <AiInfluencerShift signedIn={signedIn} />
      <AiInfluencerExamples />
      <AiInfluencerPost />
      <AiInfluencerCta signedIn={signedIn} />
    </PolicyLayout>
  );
}
