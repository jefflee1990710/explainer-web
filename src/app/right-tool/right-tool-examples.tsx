"use client";

import { FeatureExamples } from "@/presentation/components/feature-examples";
import { useI18n } from "@/presentation/components/i18n-provider";

const ART = [
  "/landing/right-tool/ex-talk.jpg",
  "/landing/right-tool/ex-board.jpg",
  "/landing/right-tool/ex-promo.jpg",
  "/landing/right-tool/ex-edit.jpg",
] as const;

// Four formats that share the same generate-then-edit pipeline.
export function RightToolExamples() {
  const { t } = useI18n();
  const items = [1, 2, 3, 4].map((n, index) => ({
    src: ART[index],
    title: t(`featureExamples.tool.e${n}Title`),
    body: t(`featureExamples.tool.e${n}Body`),
  }));

  return (
    <FeatureExamples
      eyebrow={t("featureExamples.eyebrow")}
      title={t("featureExamples.tool.title")}
      body={t("featureExamples.tool.body")}
      items={items}
    />
  );
}
