"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { EXAMPLE_FRAME, type ExampleItem } from "@/presentation/components/example-catalog";
import { useI18n } from "@/presentation/components/i18n-provider";
import { MotionItem } from "@/presentation/components/motion-reveal";
import { localizedStyleName } from "@/util/style-i18n";

// Finished clip inside a studio frame. The poster stays if the file is missing.
function ExampleFrame({ item }: { item: ExampleItem }) {
  const frame = EXAMPLE_FRAME[item.aspect];
  const videoRef = useRef<HTMLVideoElement>(null);
  const [play, setPlay] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const hide = () => setPlay(false);
    video.addEventListener("error", hide);
    if (video.error) hide();
    return () => video.removeEventListener("error", hide);
  }, []);

  return (
    <div className={`overflow-hidden rounded-xl border border-[#e4e4e7] bg-[#12141c] ${frame.width}`}>
      <div className={`relative ${frame.aspect}`}>
        <img src={item.poster} alt="" className="absolute inset-0 h-full w-full object-cover" />
        {play ? (
          <video
            ref={videoRef}
            src={item.src}
            poster={item.poster}
            className="absolute inset-0 h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            onError={() => setPlay(false)}
          />
        ) : null}
      </div>
    </div>
  );
}

// One explainer type on a white studio card. Rows alternate which side holds the clip.
export function ExampleBand({
  item,
  index,
  flip,
  signedIn = false,
}: {
  item: ExampleItem;
  index: number;
  flip: boolean;
  signedIn?: boolean;
}) {
  const { t } = useI18n();
  const product = item.id.startsWith("product");
  const href = signedIn ? "/app" : "/sign-up";
  const cta = product ? t("productPromoPage.hero.ctaStart") : t("explainerPage.hero.ctaStart");

  return (
    <MotionItem>
      <article
        id={item.id}
        className="grid items-center gap-8 rounded-2xl border border-[#e4e4e7] bg-white p-6 transition-shadow duration-200 hover:shadow-[0_8px_24px_rgba(22,24,35,0.08)] md:gap-12 md:p-10 lg:grid-cols-2"
      >
        <div className={`flex ${flip ? "lg:order-2 lg:justify-end" : ""}`}>
          <ExampleFrame item={item} />
        </div>
        <div className={flip ? "lg:order-1" : ""}>
          <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#12141c]">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#12141c] text-xs font-bold text-[#c6f24b]">
              {String(index + 1).padStart(2, "0")}
            </span>
            {t(item.useKey)} · {item.aspect}
          </p>
          <h2 className="mt-4 font-display text-pretty text-2xl font-bold leading-[1.15] tracking-tight text-[#12141c] md:text-3xl">
            {t(item.titleKey)}
          </h2>
          <p className="mt-4 text-base leading-7 text-[#5c6170]">{t(item.bodyKey)}</p>
          <p className="mt-5 flex items-start gap-2.5 text-sm font-medium text-[#12141c]">
            <span aria-hidden className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#c6f24b] ring-2 ring-[#12141c]/15" />
            {localizedStyleName(item.styleId)}
          </p>
          <Link
            href={href}
            className="mt-8 inline-flex min-h-10 items-center justify-center rounded-full bg-[#12141c] px-7 py-2.5 text-sm font-semibold text-[#c6f24b] transition-colors hover:bg-black"
          >
            {cta}
          </Link>
        </div>
      </article>
    </MotionItem>
  );
}
