"use client";

import { ParallaxLayer } from "@/presentation/components/parallax-layer";

// Desktop art fills the hero. Mobile splits the portrait so the copy sits between the two scenes.
// Pop art redraw of the desk and poster-wall scene; the wide still loops via MiniMax H3.
export function LandingHeroArt() {
  return (
    <>
      <ParallaxLayer distance={28} className="lg:hidden">
        <img
          src="/hero/scene-pop-mobile-top.png"
          alt=""
          className="hero-drift pointer-events-none h-auto w-full"
        />
      </ParallaxLayer>
      <ParallaxLayer className="pointer-events-none absolute inset-[-10%] hidden h-auto lg:block" distance={96}>
        <video
          src="/hero/scene-pop-loop.mp4"
          poster="/hero/scene-pop.png"
          autoPlay
          muted
          loop
          playsInline
          aria-hidden
          className="h-full w-full object-cover object-center motion-reduce:hidden"
        />
        <img
          src="/hero/scene-pop.png"
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
        src="/hero/scene-pop-mobile-bottom.png"
        alt=""
        className="hero-drift pointer-events-none h-auto w-full"
      />
    </ParallaxLayer>
  );
}
