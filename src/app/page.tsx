import { PolicyLayout } from "@/presentation/components/legal/policy-layout";
import { getAuthSession } from "@/service/auth";
import { LandingCast } from "@/presentation/components/landing-cast";
import { LandingFreeCredit } from "@/presentation/components/landing-free-credit";
import { LandingHero } from "@/presentation/components/landing-hero";
import { LandingDirector } from "@/presentation/components/landing-director";
import { LandingIp } from "@/presentation/components/landing-ip";
import { LandingKol } from "@/presentation/components/landing-kol";
import { LandingSteps } from "@/presentation/components/landing-steps";
import { LandingUseCases } from "@/presentation/components/landing-use-cases";

// Plans live on /pricing. Landing leads with soul injection for virtual KOLs, then identity lock, brand IP wardrobe/posts, Life feed, use cases, steps, cost control, and free credits.
export default async function HomePage() {
  const session = await getAuthSession();
  return (
    <PolicyLayout>
      <LandingHero signedIn={Boolean(session)} />
      <LandingCast />
      <LandingIp />
      <LandingKol />
      <LandingUseCases signedIn={Boolean(session)} />
      <LandingSteps signedIn={Boolean(session)} />
      <LandingDirector />
      <LandingFreeCredit signedIn={Boolean(session)} />
    </PolicyLayout>
  );
}
