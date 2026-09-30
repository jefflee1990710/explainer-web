"use client";

import Link from "next/link";
import { useI18n } from "@/presentation/components/i18n-provider";

// Landing entry to the examples page. The clips themselves live on /examples.
export function LandingExamplesLink() {
  const { t } = useI18n();

  return (
    <section className="relative overflow-hidden bg-white text-center">
      {/* Rings are short silent loops. The crop matches each still so the center stays clear for the title. */}
      <div className="relative aspect-[864/1184] w-full overflow-hidden motion-reduce:hidden md:hidden">
        <video
          src="/landing/examples-ring-mobile-loop.mp4?v=2"
          poster="/landing/examples-ring-mobile.png?v=3"
          autoPlay
          muted
          loop
          playsInline
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
      <img
        src="/landing/examples-ring-mobile.png?v=3"
        alt=""
        className="hidden h-auto w-full motion-reduce:block md:hidden"
      />
      <div className="relative mx-auto hidden aspect-[1344/768] w-full max-w-6xl overflow-hidden motion-reduce:hidden md:block">
        <video
          src="/landing/examples-ring-loop.mp4?v=2"
          poster="/landing/examples-ring.png?v=3"
          autoPlay
          muted
          loop
          playsInline
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
      <img
        src="/landing/examples-ring.png?v=3"
        alt=""
        className="mx-auto hidden h-auto w-full max-w-6xl motion-reduce:md:block"
      />
      <div className="absolute inset-0 flex items-center justify-center px-6">
        <div className="max-w-[11rem] sm:max-w-xl">
          <h2 className="text-xl font-bold text-[#12141c] sm:text-3xl">{t("examples.title")}</h2>
          <p className="mx-auto mt-3 text-sm leading-snug text-zinc-600 sm:text-base">{t("examples.subtitle")}</p>
          <Link
            href="/examples"
            className="mt-8 inline-flex rounded-full bg-[#12141c] px-8 py-3 text-sm font-semibold text-[#c6f24b] transition-colors hover:bg-black"
          >
            {t("examples.cta")}
          </Link>
        </div>
      </div>
    </section>
  );
}
