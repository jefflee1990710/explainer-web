// Desktop art fills the hero. Mobile splits the portrait so the copy sits between the two scenes.
// The wide still is a short Higgsfield loop: steam, drawing, and the two people talking.
export function LandingHeroArt() {
  return (
    <>
      <img
        src="/hero/scene-mobile-top.png?v=1"
        alt=""
        className="hero-drift pointer-events-none h-auto w-full lg:hidden"
      />
      <video
        src="/hero/scene-loop.mp4?v=2"
        poster="/hero/scene.png"
        autoPlay
        muted
        loop
        playsInline
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden h-full w-full scale-[1.06] object-cover object-center lg:block motion-reduce:hidden"
      />
      <img
        src="/hero/scene.png"
        alt=""
        className="pointer-events-none absolute inset-0 hidden h-full w-full scale-[1.06] object-cover object-center motion-reduce:lg:block"
      />
    </>
  );
}

export function LandingHeroArtBottom() {
  return (
    <img
      src="/hero/scene-mobile-bottom.png?v=1"
      alt=""
      className="hero-drift pointer-events-none h-auto w-full lg:hidden"
    />
  );
}
