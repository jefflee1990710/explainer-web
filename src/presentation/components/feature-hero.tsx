import Link from "next/link";

type HeroLink = { href: string; label: string };

type FeatureHeroProps = {
  brand: string;
  kicker: string;
  title: string;
  subtitle: string;
  primary: HeroLink;
  secondary: HeroLink;
  /** Hero still shown at its native ratio — width/height keep the box stable before load. */
  art: { src: string; width: number; height: number; alt?: string; widthClass?: string };
};

// Shared feature-page hero: copy left, uncropped hero still right, art colours bleed into the ink stage.
export function FeatureHero({ brand, kicker, title, subtitle, primary, secondary, art }: FeatureHeroProps) {
  return (
    <section className="relative isolate overflow-hidden border-b border-black/40 bg-[#0a0c10]">
      {/* Ambient wash sampled from the hero art, so the stage matches the still. */}
      <img
        src={art.src}
        alt=""
        aria-hidden
        className="absolute inset-0 -z-10 h-full w-full scale-125 object-cover opacity-30 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_12%_18%,rgba(198,242,75,0.16),transparent_45%),linear-gradient(180deg,rgba(10,12,16,0.5)_0%,rgba(10,12,16,0.82)_60%,#0a0c10_100%)]"
      />

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-16 pt-14 md:px-8 lg:min-h-[40rem] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16 lg:py-20">
        <div className="max-w-xl">
          <p className="font-display text-5xl font-bold tracking-tight text-[#c6f24b] sm:text-6xl">{brand}</p>
          <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#c6f24b]/35 bg-[#12141c]/90 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#c6f24b]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#c6f24b]" />
            {kicker}
          </p>
          <h1 className="mt-6 font-display text-balance text-3xl font-bold leading-[1.08] tracking-tight text-white sm:text-4xl xl:text-[2.75rem]">
            {title}
          </h1>
          <p className="mt-5 max-w-lg text-pretty text-base font-medium leading-7 text-white/75 sm:text-lg">
            {subtitle}
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              href={primary.href}
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#c6f24b] px-7 py-3 text-sm font-semibold text-[#12141c] shadow-[0_12px_36px_rgba(198,242,75,0.28)] transition-transform hover:-translate-y-0.5 hover:bg-[#d4f76a]"
            >
              {primary.label}
            </Link>
            <Link
              href={secondary.href}
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/20 bg-white/10 px-7 py-3 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/15"
            >
              {secondary.label}
            </Link>
          </div>
        </div>

        <figure className={`relative mx-auto w-full lg:mr-0 ${art.widthClass ?? ""}`}>
          <div aria-hidden className="absolute -inset-5 rounded-[2rem] bg-[#c6f24b]/12 blur-3xl" />
          <img
            src={art.src}
            alt={art.alt ?? ""}
            width={art.width}
            height={art.height}
            className="relative h-auto w-full rounded-2xl shadow-[0_30px_80px_rgba(0,0,0,0.55)] ring-1 ring-white/15"
          />
        </figure>
      </div>
    </section>
  );
}
