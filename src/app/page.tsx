import { SiteHeader } from "@/presentation/components/site-header";
import { StudioBackdrop } from "@/presentation/components/studio-backdrop";
import { LandingHero } from "@/presentation/components/landing-hero";
import { LandingPricing } from "@/presentation/components/landing-pricing";
import { LandingSteps } from "@/presentation/components/landing-steps";

export default function HomePage() {
  return (
    <div className="studio-canvas relative flex flex-1 flex-col">
      <StudioBackdrop />
      <div className="relative z-10">
        <SiteHeader />
        <LandingHero />
        <LandingSteps />
        <LandingPricing />
      </div>
    </div>
  );
}
