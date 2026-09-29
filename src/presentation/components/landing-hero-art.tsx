// Desktop art is the wide line drawing. Mobile reuses those same scenes, stacked.
export function LandingHeroArt() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <img
        src="/hero/scene-mobile.png?v=5"
        alt=""
        className="hero-drift h-full w-full object-cover object-center lg:hidden"
      />
      <img
        src="/hero/scene.png"
        alt=""
        className="hero-drift hidden h-full w-full object-cover object-center lg:block"
      />
    </div>
  );
}
