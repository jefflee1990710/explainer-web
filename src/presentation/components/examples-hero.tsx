"use client";

import { useI18n } from "@/presentation/components/i18n-provider";

// Packed style morph. A small quiet center holds the title.
export function ExamplesHero() {
  const { t } = useI18n();

  return (
    <header className="relative overflow-hidden bg-[#f6f1e8]">
      <img
        src="/examples/hero-mobile.png?v=3"
        alt=""
        className="h-[min(34rem,72svh)] w-full object-cover object-center lg:hidden"
      />
      <img
        src="/examples/hero.png?v=3"
        alt=""
        className="hidden h-auto w-full lg:block"
      />
      <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
        <div className="max-w-3xl rounded-[2rem] bg-[#f6f1e8]/80 px-5 py-4 lg:bg-transparent lg:px-0 lg:py-0">
          <h1 className="text-pretty text-3xl font-bold leading-[1.12] tracking-tight text-[#12141c] sm:text-5xl">
            {t("examples.heroTitle")}
          </h1>
        </div>
      </div>
    </header>
  );
}
