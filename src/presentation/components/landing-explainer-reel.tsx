"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { SectionCtaRow } from "@/presentation/components/section-cta-row";

// One landscape still of three phones, cropped into the hook, whiteboard, and payoff of a 9:16 reel.
const REEL_STILL = "/landing/explainer/social.jpg";
const FRAME_POSITION = ["object-[8%_center]", "object-center", "object-[92%_center]"] as const;

// Homepage band under the hero: an explainer reel is hook, whiteboard, then payoff.
export function LandingExplainerReel({ signedIn = false }: { signedIn?: boolean }) {
  const { t } = useI18n();
  const frames = [
    { title: t("landing.academy.card1Title"), body: t("landing.academy.card1Body") },
    { title: t("landing.academy.card2Title"), body: t("landing.academy.card2Body") },
    { title: t("landing.academy.card3Title"), body: t("landing.academy.card3Body") },
  ];
  const points = [
    t("landing.academy.point1"),
    t("landing.academy.point2"),
    t("landing.academy.point3"),
  ];

  return (
    <section id="explainer-reel" className="border-b border-[#e4e4e7] bg-white px-4 py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="inline-flex items-center rounded-full bg-[#f4fcd4] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#12141c]">
            {t("landing.academy.eyebrow")}
          </p>
          <h2 className="mt-4 font-display text-pretty text-3xl font-bold leading-[1.12] tracking-tight text-[#12141c] sm:text-4xl lg:text-5xl">
            {t("landing.academy.title")}
          </h2>
          <p className="mt-4 text-base leading-7 text-[#5c6170]">{t("landing.academy.body")}</p>
        </div>

        <ol className="-mx-4 mt-12 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:px-0">
          {frames.map((frame, index) => (
            <li key={frame.title} className="w-[68%] shrink-0 snap-center sm:w-[46%] md:w-auto">
              <article className="rounded-[1.75rem] border border-[#e4e4e7] bg-[#12141c] p-2 transition-shadow duration-200 hover:shadow-[0_8px_24px_rgba(22,24,35,0.08)]">
                <div className="relative overflow-hidden rounded-[1.35rem] bg-black">
                  <img
                    src={REEL_STILL}
                    alt=""
                    className={`aspect-[9/16] w-full object-cover ${FRAME_POSITION[index]}`}
                  />
                  <span className="absolute left-3 top-3 inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-[#12141c]/85 px-2 text-[11px] font-bold tracking-[0.12em] text-[#c6f24b]">
                    0{index + 1}
                  </span>
                </div>
              </article>
              <h3 className="mt-4 text-center font-display text-lg font-semibold text-[#12141c]">{frame.title}</h3>
              <p className="mt-1 text-center text-sm leading-6 text-[#5c6170]">{frame.body}</p>
            </li>
          ))}
        </ol>

        <ul className="mx-auto mt-10 flex max-w-3xl flex-col items-center gap-2 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-3">
          {points.map((point) => (
            <li
              key={point}
              className="rounded-full border border-[#e4e4e7] bg-[#fafafa] px-3.5 py-1.5 text-xs font-semibold text-[#12141c]"
            >
              {point}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-center text-xs font-semibold uppercase tracking-[0.14em] text-[#5c6170]">
          {t("landing.academy.freeBadge")}
        </p>
        <SectionCtaRow
          align="center"
          primary={{
            href: signedIn ? "/app" : "/sign-up",
            label: signedIn ? t("landing.academy.ctaContinue") : t("landing.academy.ctaRegister"),
          }}
          secondary={{ href: "/explainer", label: t("landing.academy.ctaBrowse") }}
        />
      </div>
    </section>
  );
}
