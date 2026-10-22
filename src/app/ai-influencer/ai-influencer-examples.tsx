"use client";

import { FeatureExamples } from "@/presentation/components/feature-examples";
import { useI18n } from "@/presentation/components/i18n-provider";

const ART = [
  "/landing/ai-influencer/ex-cafe.jpg",
  "/landing/ai-influencer/ex-desk.jpg",
  "/landing/ai-influencer/ex-street.jpg",
  "/landing/ai-influencer/ex-unbox.jpg",
] as const;

// Four pictured jobs for one AI Influencer face.
export function AiInfluencerExamples() {
  const { t } = useI18n();
  const items = [1, 2, 3, 4].map((n, index) => ({
    src: ART[index],
    title: t(`featureExamples.ai.e${n}Title`),
    body: t(`featureExamples.ai.e${n}Body`),
  }));

  return (
    <FeatureExamples
      eyebrow={t("featureExamples.eyebrow")}
      title={t("featureExamples.ai.title")}
      body={t("featureExamples.ai.body")}
      items={items}
    />
  );
}
