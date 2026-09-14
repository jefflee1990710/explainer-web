import { SiteHeader } from "@/components/site-header";
import { StudioBackdrop } from "@/components/studio-backdrop";
import { LandingHero } from "./landing-hero";
import { LandingPricing } from "./landing-pricing";
import { LandingSteps } from "./landing-steps";

export default function HomePage() {
  return (
    <div className="relative min-h-full studio-canvas">
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
