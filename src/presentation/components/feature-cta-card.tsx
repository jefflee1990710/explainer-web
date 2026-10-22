"use client";

import Link from "next/link";
import { ParallaxLayer } from "@/presentation/components/parallax-layer";

type CtaAction = {
  href: string;
  label: string;
};

type FeatureCtaCardProps = {
  eyebrow: string;
  title: string;
  body: string;
  artSrc: string;
  primary: CtaAction;
  secondary?: CtaAction;
  tertiary?: CtaAction;
};

// Shared closing CTA band styled after LandingFreeCredit: lime stage, white studio desk card, character art left, actions right.
export function FeatureCtaCard({
  eyebrow,
  title,
  body,
  artSrc,
  primary,
  secondary,
  tertiary,
}: FeatureCtaCardProps) {
  return (
    <section className="border-t border-[#e4e4e7] bg-[#f4fcd4] px-4 py-16 md:px-8 md:py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-10 rounded-2xl border border-[#e4e4e7] bg-white p-6 shadow-[0_8px_24px_rgba(22,24,35,0.06)] md:p-10 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="overflow-hidden rounded-xl border border-[#e4e4e7] bg-[#12141c]">
          <ParallaxLayer distance={16}>
            <img src={artSrc} alt="" className="aspect-video w-full object-cover" />
          </ParallaxLayer>
        </div>
        <div>
          <p className="inline-flex items-center rounded-full bg-[#12141c] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#c6f24b]">
            {eyebrow}
          </p>
          <h2 className="mt-4 font-display text-pretty text-3xl font-bold tracking-tight text-[#12141c] md:text-4xl">
            {title}
          </h2>
          <p className="mt-4 text-base leading-7 text-[#5c6170]">{body}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={primary.href}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#12141c] px-8 py-3 text-sm font-semibold text-[#c6f24b] transition-colors hover:bg-black"
            >
              {primary.label}
            </Link>
            {secondary ? (
              <Link
                href={secondary.href}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#e4e4e7] bg-[#f4f4f5] px-7 py-3 text-sm font-semibold text-[#12141c] transition-colors hover:bg-zinc-200/70"
              >
                {secondary.label}
              </Link>
            ) : null}
            {tertiary ? (
              <Link
                href={tertiary.href}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#e4e4e7] bg-white px-7 py-3 text-sm font-semibold text-[#12141c] transition-colors hover:bg-zinc-100"
              >
                {tertiary.label}
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
