import { PolicyLayout } from "@/presentation/components/legal/policy-layout";
import { getAuthSession } from "@/service/auth";
import { LandingCast } from "@/presentation/components/landing-cast";
import { LandingFreeCredit } from "@/presentation/components/landing-free-credit";
import { LandingHero } from "@/presentation/components/landing-hero";
import { LandingDirector } from "@/presentation/components/landing-director";
import { LandingSteps } from "@/presentation/components/landing-steps";
import { LandingUseCases } from "@/presentation/components/landing-use-cases";

// Plans live on /pricing. The landing page ends on the free-credit sign-up band.
export default async function HomePage() {
  const session = await getAuthSession();
  return (
    <PolicyLayout>
      <LandingHero signedIn={Boolean(session)} />
      <LandingUseCases signedIn={Boolean(session)} />
      <LandingSteps />
      <LandingCast />
      <LandingDirector />
      <LandingFreeCredit signedIn={Boolean(session)} />
    </PolicyLayout>
  );
}
