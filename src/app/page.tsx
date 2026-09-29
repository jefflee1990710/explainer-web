import { SiteHeader } from "@/presentation/components/site-header";
import { LandingCast } from "@/presentation/components/landing-cast";
import { LandingHero } from "@/presentation/components/landing-hero";
import { LandingEnterprise } from "@/presentation/components/landing-enterprise";
import { LandingPersona } from "@/presentation/components/landing-persona";
import { LandingPricing } from "@/presentation/components/landing-pricing";
import { LandingDirector } from "@/presentation/components/landing-director";
import { LandingShowcase } from "@/presentation/components/landing-showcase";
import { LandingSteps } from "@/presentation/components/landing-steps";

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col bg-white text-zinc-900">
      <SiteHeader />
      <LandingHero />
      <LandingSteps />
      <LandingCast />
      <LandingPersona />
      <LandingShowcase />
      <LandingDirector />
      <LandingPricing />
      <LandingEnterprise />
    </div>
  );
}
