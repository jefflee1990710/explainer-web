"use client";

import { ParallaxLayer } from "@/presentation/components/parallax-layer";

// Scro Style paper cut-out: two vertical phones playing short videos, empty paper in the middle.
// Desktop fills the hero behind the headline. Mobile stacks it under the copy.
export function LandingHeroArt() {
  return (
    <ParallaxLayer distance={24} className="pointer-events-none lg:absolute lg:inset-0">
      <img
        src="/hero/scro-shorts.webp"
        alt=""
        className="h-auto w-full lg:h-full lg:object-cover lg:object-center"
      />
    </ParallaxLayer>
  );
}
