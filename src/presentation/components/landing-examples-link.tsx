"use client";

import Link from "next/link";
import { useI18n } from "@/presentation/components/i18n-provider";

// Landing entry to the examples page. The clips themselves live on /examples.
export function LandingExamplesLink() {
  const { t } = useI18n();

  return (
    <section className="bg-white px-6 py-16 text-center sm:py-20">
      <h2 className="text-2xl font-bold text-zinc-900 sm:text-3xl">{t("examples.title")}</h2>
      <p className="mx-auto mt-3 max-w-xl text-zinc-600">{t("examples.subtitle")}</p>
      <Link
        href="/examples"
        className="mt-8 inline-flex rounded-full bg-[#12141c] px-8 py-3 text-sm font-semibold text-[#c6f24b] transition-colors hover:bg-black"
      >
        {t("examples.cta")}
      </Link>
    </section>
  );
}
