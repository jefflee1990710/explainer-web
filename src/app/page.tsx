import { PolicyLayout } from "@/presentation/components/legal/policy-layout";
import { LandingCast } from "@/presentation/components/landing-cast";
import { LandingHero } from "@/presentation/components/landing-hero";
import { LandingEnterprise } from "@/presentation/components/landing-enterprise";
import { LandingPersona } from "@/presentation/components/landing-persona";
import { LandingPricing } from "@/presentation/components/landing-pricing";
import { LandingDirector } from "@/presentation/components/landing-director";
import { LandingExamplesLink } from "@/presentation/components/landing-examples-link";
import { LandingSteps } from "@/presentation/components/landing-steps";

export default function HomePage() {
  return (
    <PolicyLayout>
      <LandingHero />
      <LandingSteps />
      <LandingCast />
      <LandingPersona />
      <LandingExamplesLink />
      <LandingDirector />
      <LandingPricing />
      <LandingEnterprise />
    </PolicyLayout>
  );
}
