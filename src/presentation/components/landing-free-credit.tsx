"use client";

import Link from "next/link";
import { useI18n } from "@/presentation/components/i18n-provider";
import { ParallaxLayer } from "@/presentation/components/parallax-layer";

// Register-for-credits band. Claymation still and loop live in /public/cta.
export function LandingFreeCredit({ signedIn = false }: { signedIn?: boolean }) {
  const { t } = useI18n();

  return (
    <section className="bg-gradient-to-br from-[#fbe3d2] via-[#f6d2bd] to-[#efc2d6] px-4 py-16 md:px-8 md:py-20">
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="overflow-hidden rounded-3xl border-2 border-[#12141c] bg-[#f0cdb8] shadow-[6px_6px_0_0_#12141c]">
          <ParallaxLayer distance={32}>
            <video
              src="/cta/loop-clay.mp4"
              poster="/cta/still-clay.png"
              autoPlay
              muted
              loop
              playsInline
              aria-hidden
              className="aspect-video w-full scale-110 object-cover motion-reduce:hidden motion-reduce:scale-100"
            />
            <img
              src="/cta/still-clay.png"
              alt=""
              className="hidden aspect-video w-full object-cover motion-reduce:block"
            />
          </ParallaxLayer>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#c2410c]">
            {t("landing.freeCredit.eyebrow")}
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#12141c] md:text-4xl">
            {t("landing.freeCredit.title")}
          </h2>
          <p className="mt-4 text-base leading-7 text-[#12141c]/75">{t("landing.freeCredit.body")}</p>
          <Link
            href={signedIn ? "/app" : "/sign-up"}
            className="mt-8 inline-flex rounded-full bg-[#12141c] px-8 py-3 text-sm font-semibold text-[#c6f24b] transition-colors hover:bg-black"
          >
            {t("landing.freeCredit.cta")}
          </Link>
        </div>
      </div>
    </section>
  );
}
