"use client";

import { FeaturePost } from "@/presentation/components/feature-post";
import { useI18n } from "@/presentation/components/i18n-provider";

// Editorial post for the AI Influencer feature page.
export function AiInfluencerPost() {
  const { t } = useI18n();
  return (
    <FeaturePost
      eyebrow={t("featurePosts.eyebrow")}
      title={t("featurePosts.ai.title")}
      lede={t("featurePosts.ai.lede")}
      paragraphs={[t("featurePosts.ai.p1"), t("featurePosts.ai.p2"), t("featurePosts.ai.p3")]}
      imageSrc="/landing/ai-influencer/ex-cafe.jpg"
      imageAlt={t("featurePosts.ai.title")}
      igSrc="/landing/ai-influencer/ig-post.jpg"
      igLabel={t("featurePosts.igLabel")}
    />
  );
}
