import { PolicyLayout } from "@/presentation/components/legal/policy-layout";
import { getAuthSession } from "@/service/auth";
import { LandingCast } from "@/presentation/components/landing-cast";
import { LandingCatalog } from "@/presentation/components/landing-catalog";
import { LandingFreeCredit } from "@/presentation/components/landing-free-credit";
import { LandingHero } from "@/presentation/components/landing-hero";
import { LandingDirector } from "@/presentation/components/landing-director";
import { LandingIp } from "@/presentation/components/landing-ip";
import { LandingKol } from "@/presentation/components/landing-kol";
import { LandingSteps } from "@/presentation/components/landing-steps";
import { LandingUseCases } from "@/presentation/components/landing-use-cases";
import { StudioPowertoolsBand } from "@/presentation/components/studio-powertools-band";
import { catalogShowcaseStats } from "@/service/character/catalog-stats";

// Plans live on /pricing. Landing leads with soul injection for virtual KOLs, then identity lock, brand IP wardrobe/posts, Life feed, catalog depth, use cases, steps, studio powertools, cost control, and free credits.
export default async function HomePage() {
  const session = await getAuthSession();
  const catalogStats = catalogShowcaseStats();
  return (
    <PolicyLayout>
      <LandingHero signedIn={Boolean(session)} />
      <LandingCast />
      <LandingIp />
      <LandingCatalog stats={catalogStats} signedIn={Boolean(session)} />
      <LandingKol />
      <LandingUseCases signedIn={Boolean(session)} />
      <LandingSteps signedIn={Boolean(session)} />
      <StudioPowertoolsBand signedIn={Boolean(session)} />
      <LandingDirector />
      <LandingFreeCredit signedIn={Boolean(session)} />
    </PolicyLayout>
  );
}
