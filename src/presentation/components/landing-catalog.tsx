"use client";

import { MotionItem, MotionStagger } from "@/presentation/components/motion-reveal";
import { SectionCtaRow } from "@/presentation/components/section-cta-row";
import { useI18n } from "@/presentation/components/i18n-provider";
import {
  CATALOG_SHOWCASE_PREVIEWS,
  type CatalogShowcaseStats,
} from "@/service/character/catalog-stats";
import { characterLookPreviewSrc } from "@/service/character/character-look";

// Landing band: prove the wardrobe / pose / post-type database is a product pillar.
export function LandingCatalog({
  stats,
  signedIn,
}: {
  stats: CatalogShowcaseStats;
  signedIn: boolean;
}) {
  const { t } = useI18n();
  const partLabel = (part: string) => t(`characters.look.${part}`);

  return (
    <section id="catalog" className="relative overflow-hidden border-b border-[#e4e4e7] bg-[#12141c] px-4 py-20 text-[#f5f5f4] md:px-8 md:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 10% 0%, rgba(198,242,75,0.18), transparent 55%), radial-gradient(ellipse 60% 40% at 90% 100%, rgba(255,228,220,0.12), transparent 50%)",
        }}
      />
      <div className="relative mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="inline-flex items-center rounded-full bg-[#c6f24b] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#12141c]">
            {t("landing.catalog.eyebrow")}
          </p>
          <h2 className="mt-4 font-display text-pretty text-3xl font-bold leading-[1.12] tracking-tight sm:text-4xl lg:text-5xl">
            {t("landing.catalog.title")}
          </h2>
          <p className="mt-4 text-base leading-7 text-[#a1a1aa]">{t("landing.catalog.body")}</p>
        </div>

        <MotionStagger className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { value: stats.wardrobeTotal, label: t("landing.catalog.statLooks") },
            { value: stats.poses, label: t("landing.catalog.statPoses") },
            { value: stats.postTemplates, label: t("landing.catalog.statPosts") },
            { value: stats.tagExamples.length, label: t("landing.catalog.statTags") },
          ].map((stat) => (
            <MotionItem key={stat.label}>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-center backdrop-blur-sm">
                <p className="font-display text-3xl font-bold tracking-tight text-[#c6f24b] sm:text-4xl">
                  {stat.value.toLocaleString()}
                </p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#a1a1aa]">
                  {stat.label}
                </p>
              </div>
            </MotionItem>
          ))}
        </MotionStagger>

        <MotionStagger className="mt-10 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 md:gap-3">
          {CATALOG_SHOWCASE_PREVIEWS.map((item) => (
            <MotionItem key={`${item.part}-${item.id}`}>
              <figure className="overflow-hidden rounded-xl border border-white/10 bg-[#1a1d27]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={characterLookPreviewSrc(item.part, item.id)}
                  alt=""
                  className="aspect-square w-full object-cover transition duration-500 hover:scale-[1.04]"
                />
                <figcaption className="truncate border-t border-white/10 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#a1a1aa]">
                  {partLabel(item.part)}
                </figcaption>
              </figure>
            </MotionItem>
          ))}
        </MotionStagger>

        <MotionStagger className="mt-8 flex flex-wrap justify-center gap-2">
          {stats.tagExamples.map((tag) => (
            <MotionItem key={tag}>
              <span className="inline-flex rounded-full border border-[#c6f24b]/35 bg-[#c6f24b]/10 px-3 py-1 text-xs font-bold text-[#c6f24b]">
                #{tag}
              </span>
            </MotionItem>
          ))}
        </MotionStagger>

        <p className="mx-auto mt-8 max-w-xl text-center text-sm leading-6 text-[#a1a1aa]">
          {t("landing.catalog.footnote")}
        </p>

        <SectionCtaRow
          tone="dark"
          align="center"
          primary={{
            href: signedIn ? "/app/characters/generate" : "/sign-up",
            label: t("landing.catalog.cta"),
          }}
          secondary={{
            href: signedIn ? "/app/life" : "/ai-influencer",
            label: t("landing.catalog.ctaSecondary"),
          }}
        />
      </div>
    </section>
  );
}
