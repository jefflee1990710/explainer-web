"use client";

import { ExampleBand } from "@/presentation/components/example-band";
import { EXAMPLE_ITEMS } from "@/presentation/components/example-catalog";
import { useI18n } from "@/presentation/components/i18n-provider";

// Each explainer type gets its own band, alternating which side holds the copy.
export function ExamplesView() {
  const { t } = useI18n();

  return (
    <main>
      <header className="mx-auto max-w-3xl px-6 py-16 text-center sm:py-20">
        <h1 className="text-pretty text-3xl font-bold leading-[1.12] tracking-tight text-[#12141c] sm:text-5xl">
          {t("examples.title")}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-zinc-600">{t("examples.subtitle")}</p>
      </header>
      {EXAMPLE_ITEMS.map((item, index) => (
        <ExampleBand key={item.id} item={item} flip={index % 2 === 1} />
      ))}
    </main>
  );
}
