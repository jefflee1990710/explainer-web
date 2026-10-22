"use client";

import { FeatureExamples } from "@/presentation/components/feature-examples";
import { useI18n } from "@/presentation/components/i18n-provider";

const ART = [
  "/landing/explainer/ex-funnel.jpg",
  "/landing/explainer/ex-nodes.jpg",
  "/landing/explainer/ex-deck.jpg",
  "/landing/explainer/ex-phones.jpg",
] as const;

// Four explainer frames that stay readable without narration.
export function ExplainerExamples() {
  const { t } = useI18n();
  const items = [1, 2, 3, 4].map((n, index) => ({
    src: ART[index],
    title: t(`featureExamples.explain.e${n}Title`),
    body: t(`featureExamples.explain.e${n}Body`),
  }));

  return (
    <FeatureExamples
      eyebrow={t("featureExamples.eyebrow")}
      title={t("featureExamples.explain.title")}
      body={t("featureExamples.explain.body")}
      items={items}
    />
  );
}
