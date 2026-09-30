"use client";

import { ParallaxLayer } from "@/presentation/components/parallax-layer";

// Desktop art fills the hero. Mobile splits the portrait so the copy sits between the two scenes.
// The wide still is a short Higgsfield loop: steam, drawing, and the two people talking.
export function LandingHeroArt() {
  return (
    <>
      <ParallaxLayer distance={28} className="lg:hidden">
        <img
          src="/hero/scene-mobile-top.png?v=1"
          alt=""
          className="hero-drift pointer-events-none h-auto w-full"
        />
      </ParallaxLayer>
      <ParallaxLayer className="pointer-events-none absolute inset-[-10%] hidden h-auto lg:block" distance={96}>
        <video
          src="/hero/scene-loop.mp4?v=2"
          poster="/hero/scene.png"
          autoPlay
          muted
          loop
          playsInline
          aria-hidden
          className="h-full w-full object-cover object-center motion-reduce:hidden"
        />
        <img
          src="/hero/scene.png"
          alt=""
          className="hidden h-full w-full object-cover object-center motion-reduce:block"
        />
      </ParallaxLayer>
    </>
  );
}

export function LandingHeroArtBottom() {
  return (
    <ParallaxLayer distance={28} className="lg:hidden">
      <img
        src="/hero/scene-mobile-bottom.png?v=1"
        alt=""
        className="hero-drift pointer-events-none h-auto w-full"
      />
    </ParallaxLayer>
  );
}
