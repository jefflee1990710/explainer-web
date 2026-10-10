"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { MotionStagger } from "@/presentation/components/motion-reveal";
import { LandingUseCaseRow, type LandingUseCase } from "@/presentation/components/landing-use-case-row";

const ART = "/landing/use-cases";

// The five jobs Scro does for short video. Rows alternate art left and right.
const USE_CASES = [
  { id: "explain", key: "explain", appHref: "/app" },
  { id: "saas", key: "saas", appHref: "/app" },
  { id: "product", key: "product", appHref: "/app/products" },
  { id: "tutorial", key: "tutorial", appHref: "/app" },
  { id: "virtual-you", key: "virtualYou", appHref: "/app/characters" },
] as const;

export function LandingUseCases({ signedIn = false }: { signedIn?: boolean }) {
  const { t } = useI18n();
  const items: LandingUseCase[] = USE_CASES.map(({ id, key, appHref }) => ({
    id,
    art: `${ART}/${id}.webp`,
    eyebrow: t(`landing.useCases.${key}.eyebrow`),
    title: t(`landing.useCases.${key}.title`),
    body: t(`landing.useCases.${key}.body`),
    points: [
      t(`landing.useCases.${key}.point1`),
      t(`landing.useCases.${key}.point2`),
      t(`landing.useCases.${key}.point3`),
    ],
    cta: t(`landing.useCases.${key}.cta`),
    // Signed-out visitors land on sign-up first; app routes need an account.
    href: signedIn ? appHref : "/sign-up",
  }));

  return (
    // Same white paper as the hero so the cut-out art sits on one sheet.
    <section id="use-cases" className="scroll-mt-16 bg-[#f3f3f3] px-4 py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#3f9a16]">
            {t("landing.useCases.eyebrow")}
          </p>
          <h2 className="mt-3 text-pretty text-3xl font-bold leading-[1.12] tracking-tight text-[#12141c] sm:text-4xl lg:text-5xl">
            {t("landing.useCases.title")}
          </h2>
          <p className="mt-4 text-base text-[#12141c]/75">{t("landing.useCases.subtitle")}</p>
        </div>
        {/* Each row reveals on its own; one tall wrapper never reaches 20% in view on a phone. */}
        <div className="mt-16 flex flex-col gap-20 md:gap-28">
          {items.map((item, index) => (
            <MotionStagger key={item.id}>
              <LandingUseCaseRow item={item} index={index} flip={index % 2 === 1} />
            </MotionStagger>
          ))}
        </div>
      </div>
    </section>
  );
}
