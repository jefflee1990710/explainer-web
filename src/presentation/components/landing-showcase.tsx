"use client";

import { LandingShowcaseCard } from "@/presentation/components/landing-showcase-card";
import { useI18n } from "@/presentation/components/i18n-provider";
import { localizedStyleName } from "@/util/style-i18n";
import type { StyleId } from "@/service/style";

type ShowcaseItem = {
  id: string;
  // Drop the finished clip at this path; the poster shows until the file exists.
  src: string;
  poster: string;
  styleId: StyleId;
  aspect: "9:16" | "16:9" | "1:1";
  useKey: "landing.showcase.reel" | "landing.showcase.deck" | "landing.showcase.marketing";
  topicKey: "landing.showcase.scro" | "landing.showcase.product";
};

const ITEMS: ShowcaseItem[] = [
  {
    id: "scro-reel",
    src: "/showcase/scro-reel.mp4",
    poster: "/showcase/scro-reel.png",
    styleId: "doodle",
    aspect: "9:16",
    useKey: "landing.showcase.reel",
    topicKey: "landing.showcase.scro",
  },
  {
    id: "scro-deck",
    src: "/showcase/scro-deck.mp4",
    poster: "/showcase/scro-deck.png",
    styleId: "flat-vector",
    aspect: "16:9",
    useKey: "landing.showcase.deck",
    topicKey: "landing.showcase.scro",
  },
  {
    id: "product-marketing",
    src: "/showcase/product-marketing.mp4",
    poster: "/showcase/product-marketing.png",
    styleId: "clay",
    aspect: "1:1",
    useKey: "landing.showcase.marketing",
    topicKey: "landing.showcase.product",
  },
  {
    id: "product-reel",
    src: "/showcase/product-reel.mp4",
    poster: "/showcase/product-reel.png",
    styleId: "pixel",
    aspect: "16:9",
    useKey: "landing.showcase.reel",
    topicKey: "landing.showcase.product",
  },
];

const FRAME: Record<ShowcaseItem["aspect"], { width: string; aspect: string }> = {
  "9:16": { width: "w-[min(16rem,70vw)]", aspect: "aspect-[9/16]" },
  "16:9": { width: "w-[min(28rem,78vw)]", aspect: "aspect-video" },
  "1:1": { width: "w-[min(18rem,70vw)]", aspect: "aspect-square" },
};

export function LandingShowcase() {
  const { t } = useI18n();

  return (
    <section id="results" className="bg-white px-4 py-16 md:px-8">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-2xl font-bold text-zinc-900 sm:text-3xl">{t("landing.showcase.title")}</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-zinc-600">{t("landing.showcase.subtitle")}</p>
        <div className="mt-10 flex items-stretch gap-5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {ITEMS.map((item) => (
            <LandingShowcaseCard
              key={item.id}
              src={item.src}
              poster={item.poster}
              widthClass={FRAME[item.aspect].width}
              aspectClass={FRAME[item.aspect].aspect}
              useLabel={t(item.useKey)}
              aspect={item.aspect}
              styleLabel={localizedStyleName(t, item.styleId)}
              topic={t(item.topicKey)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
