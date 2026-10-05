import { PolicyLayout } from "@/presentation/components/legal/policy-layout";
import { getAuthSession } from "@/service/auth";
import { LandingCast } from "@/presentation/components/landing-cast";
import { LandingFreeCredit } from "@/presentation/components/landing-free-credit";
import { LandingHero } from "@/presentation/components/landing-hero";
import { LandingEnterprise } from "@/presentation/components/landing-enterprise";
import { LandingPersona } from "@/presentation/components/landing-persona";
import { LandingPricing } from "@/presentation/components/landing-pricing";
import { LandingDirector } from "@/presentation/components/landing-director";
import { LandingSteps } from "@/presentation/components/landing-steps";

export default async function HomePage() {
  const session = await getAuthSession();
  return (
    <PolicyLayout>
      <LandingHero signedIn={Boolean(session)} />
      <LandingFreeCredit signedIn={Boolean(session)} />
      <LandingSteps />
      <LandingCast />
      <LandingPersona />
      <LandingDirector />
      <LandingPricing />
      <LandingEnterprise />
    </PolicyLayout>
  );
}
