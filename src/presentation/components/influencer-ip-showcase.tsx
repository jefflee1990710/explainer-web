"use client";

import { ArtFrame } from "@/presentation/components/art-frame";
import { useI18n } from "@/presentation/components/i18n-provider";
import { INFLUENCER_IP_ART, type InfluencerIpArtSet } from "@/presentation/components/influencer-ip-art";
import { MotionItem, MotionStagger } from "@/presentation/components/motion-reveal";
import { SectionCtaRow } from "@/presentation/components/section-cta-row";

type CopyKey =
  | "landing.ip"
  | "aiInfluencerPage.ip";

// Wardrobe + Life posts + daily refresh + custom fashion — build one brand IP.
export function InfluencerIpShowcase({
  copyKey,
  id = "ip",
  art = INFLUENCER_IP_ART,
}: {
  copyKey: CopyKey;
  id?: string;
  art?: InfluencerIpArtSet;
}) {
  const { t } = useI18n();
  const points = [
    { title: t(`${copyKey}.p1Title`), body: t(`${copyKey}.p1Body`) },
    { title: t(`${copyKey}.p2Title`), body: t(`${copyKey}.p2Body`) },
    { title: t(`${copyKey}.p3Title`), body: t(`${copyKey}.p3Body`) },
  ];

  return (
    <section id={id} className="border-b border-[#e4e4e7] bg-[#fafafa] px-4 py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="inline-flex items-center rounded-full bg-[#f4fcd4] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#12141c]">
            {t(`${copyKey}.eyebrow`)}
          </p>
          <h2 className="mt-4 font-display text-pretty text-3xl font-bold leading-[1.12] tracking-tight text-[#12141c] sm:text-4xl lg:text-5xl">
            {t(`${copyKey}.title`)}
          </h2>
          <p className="mt-4 text-base leading-7 text-[#5c6170]">{t(`${copyKey}.body`)}</p>
        </div>

        <MotionStagger className="mt-14 grid gap-4 md:grid-cols-2">
          <MotionItem>
            <figure className="overflow-hidden rounded-2xl border border-[#e4e4e7] bg-white transition-shadow duration-200 hover:shadow-[0_8px_24px_rgba(22,24,35,0.08)]">
              <img
                src={art.wardrobe}
                alt=""
                className="aspect-square w-full object-cover"
              />
              <figcaption className="border-t border-[#e4e4e7] px-4 py-3 text-sm font-semibold text-[#12141c]">
                {t(`${copyKey}.wardrobeLabel`)}
              </figcaption>
            </figure>
          </MotionItem>
          <MotionItem>
            <figure className="overflow-hidden rounded-2xl border border-[#e4e4e7] bg-white transition-shadow duration-200 hover:shadow-[0_8px_24px_rgba(22,24,35,0.08)]">
              {/* Contained inside the square slot so edge posts are never sliced. */}
              <ArtFrame src={art.lifeFeed} className="aspect-square w-full" />
              <figcaption className="border-t border-[#e4e4e7] px-4 py-3 text-sm font-semibold text-[#12141c]">
                {t(`${copyKey}.postsLabel`)}
              </figcaption>
            </figure>
          </MotionItem>
        </MotionStagger>

        <MotionStagger className="mt-4 grid gap-4">
          <MotionItem>
            <figure className="overflow-hidden rounded-2xl border border-[#e4e4e7] bg-white transition-shadow duration-200 hover:shadow-[0_8px_24px_rgba(22,24,35,0.08)]">
              <img
                src={art.daily}
                alt=""
                className={`${art.dailyAspectClass ?? "aspect-[1512/368]"} min-h-[7.5rem] w-full object-cover sm:min-h-0`}
              />
              <figcaption className="border-t border-[#e4e4e7] px-4 py-3 text-sm font-semibold text-[#12141c]">
                {t(`${copyKey}.dailyLabel`)}
              </figcaption>
            </figure>
          </MotionItem>
          <MotionItem>
            <figure className="overflow-hidden rounded-2xl border border-[#e4e4e7] bg-white transition-shadow duration-200 hover:shadow-[0_8px_24px_rgba(22,24,35,0.08)]">
              <img
                src={art.custom}
                alt=""
                className="aspect-video w-full object-cover"
              />
              <figcaption className="border-t border-[#e4e4e7] px-4 py-3 text-sm font-semibold text-[#12141c]">
                {t(`${copyKey}.customLabel`)}
              </figcaption>
            </figure>
          </MotionItem>
        </MotionStagger>

        <MotionStagger className="mt-10 grid gap-6 md:grid-cols-3">
          {points.map((item, index) => (
            <MotionItem key={item.title}>
              <article className="flex h-full flex-col rounded-2xl border border-[#e4e4e7] bg-white p-6 transition-shadow duration-200 hover:shadow-[0_8px_24px_rgba(22,24,35,0.06)]">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#12141c] text-xs font-bold text-[#c6f24b]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-4 font-display text-xl font-semibold text-[#12141c]">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#5c6170]">{item.body}</p>
              </article>
            </MotionItem>
          ))}
        </MotionStagger>

        <SectionCtaRow
          align="center"
          primary={{ href: "/app/characters", label: t(`${copyKey}.cta`) }}
          secondary={{ href: "/product-promo", label: t("productPromoPage.hero.ctaStart") }}
        />
      </div>
    </section>
  );
}
