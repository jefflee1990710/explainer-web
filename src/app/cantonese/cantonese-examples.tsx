"use client";

import { FeatureExamples } from "@/presentation/components/feature-examples";
import { useI18n } from "@/presentation/components/i18n-provider";

const ART = [
  "/landing/cantonese/ex-cafe.jpg",
  "/landing/cantonese/ex-shop.jpg",
  "/landing/cantonese/ex-workshop.jpg",
  "/landing/cantonese/ex-stall.jpg",
] as const;

// Four Hong Kong rooms a Cantonese host can film in.
export function CantoneseExamples() {
  const { t } = useI18n();
  const items = [1, 2, 3, 4].map((n, index) => ({
    src: ART[index],
    title: t(`featureExamples.canto.e${n}Title`),
    body: t(`featureExamples.canto.e${n}Body`),
  }));

  return (
    <FeatureExamples
      eyebrow={t("featureExamples.eyebrow")}
      title={t("featureExamples.canto.title")}
      body={t("featureExamples.canto.body")}
      items={items}
    />
  );
}
