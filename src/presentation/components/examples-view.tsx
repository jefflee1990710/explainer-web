"use client";

import { ExampleBand } from "@/presentation/components/example-band";
import { EXAMPLE_ITEMS } from "@/presentation/components/example-catalog";
import { ExamplesHero } from "@/presentation/components/examples-hero";
import { FeatureCtaCard } from "@/presentation/components/feature-cta-card";
import { useI18n } from "@/presentation/components/i18n-provider";
import { MotionStagger } from "@/presentation/components/motion-reveal";

// Use-case page: feature hero, one studio card per clip, then the same closer as the home page.
export function ExamplesView({ signedIn = false }: { signedIn?: boolean }) {
  const { t } = useI18n();

  return (
    <>
      <ExamplesHero signedIn={signedIn} />
      <section
        id="clips"
        className="scroll-mt-16 border-b border-[#e4e4e7] bg-[#fafafa] px-4 py-20 md:px-8 md:py-28"
      >
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="inline-flex items-center rounded-full bg-[#f4fcd4] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#12141c]">
              {t("examples.title")}
            </p>
            <h2 className="mt-4 font-display text-pretty text-3xl font-bold leading-[1.12] tracking-tight text-[#12141c] sm:text-4xl lg:text-5xl">
              {t("examples.galleryTitle")}
            </h2>
            <p className="mt-4 text-base leading-7 text-[#5c6170]">{t("examples.galleryBody")}</p>
          </div>
          <div className="mt-16 flex flex-col gap-12 md:gap-16">
            {EXAMPLE_ITEMS.map((item, index) => (
              <MotionStagger key={item.id}>
                <ExampleBand item={item} index={index} flip={index % 2 === 1} signedIn={signedIn} />
              </MotionStagger>
            ))}
          </div>
        </div>
      </section>
      <FeatureCtaCard
        eyebrow={t("landing.freeCredit.eyebrow")}
        title={t("landing.freeCredit.title")}
        body={t("landing.freeCredit.body")}
        artSrc="/cta/free-credit-scro.webp"
        primary={{
          href: signedIn ? "/app/characters" : "/sign-up",
          label: t("landing.freeCredit.cta"),
        }}
        secondary={{ href: "/pricing", label: t("landing.freeCredit.ctaPricing") }}
      />
    </>
  );
}
