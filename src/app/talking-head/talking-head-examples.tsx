"use client";

import { FeatureExamples } from "@/presentation/components/feature-examples";
import { useI18n } from "@/presentation/components/i18n-provider";

const ART = [
  "/landing/talking-head/ex-room.jpg",
  "/landing/talking-head/ex-phone.jpg",
  "/landing/talking-head/ex-wardrobe.jpg",
  "/landing/talking-head/ex-podcast.jpg",
] as const;

// Four talking-head setups before the edit pass.
export function TalkingHeadExamples() {
  const { t } = useI18n();
  const items = [1, 2, 3, 4].map((n, index) => ({
    src: ART[index],
    title: t(`featureExamples.talk.e${n}Title`),
    body: t(`featureExamples.talk.e${n}Body`),
  }));

  return (
    <FeatureExamples
      eyebrow={t("featureExamples.eyebrow")}
      title={t("featureExamples.talk.title")}
      body={t("featureExamples.talk.body")}
      items={items}
    />
  );
}
