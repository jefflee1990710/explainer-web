"use client";

import { FeatureExamples } from "@/presentation/components/feature-examples";
import { useI18n } from "@/presentation/components/i18n-provider";

const ART = [
  "/landing/product-promo/ex-serum.jpg",
  "/landing/product-promo/ex-phones.jpg",
  "/landing/product-promo/ex-snack.jpg",
  "/landing/product-promo/ex-sneaker.jpg",
] as const;

// Four product-in-hand promo stills.
export function ProductPromoExamples() {
  const { t } = useI18n();
  const items = [1, 2, 3, 4].map((n, index) => ({
    src: ART[index],
    title: t(`featureExamples.promo.e${n}Title`),
    body: t(`featureExamples.promo.e${n}Body`),
  }));

  return (
    <FeatureExamples
      eyebrow={t("featureExamples.eyebrow")}
      title={t("featureExamples.promo.title")}
      body={t("featureExamples.promo.body")}
      items={items}
    />
  );
}
