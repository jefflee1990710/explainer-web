"use client";

import { FeaturePost } from "@/presentation/components/feature-post";
import { useI18n } from "@/presentation/components/i18n-provider";

// Editorial post for the explainer feature page.
export function ExplainerPost() {
  const { t } = useI18n();
  return (
    <FeaturePost
      eyebrow={t("featurePosts.eyebrow")}
      title={t("featurePosts.explain.title")}
      lede={t("featurePosts.explain.lede")}
      paragraphs={[t("featurePosts.explain.p1"), t("featurePosts.explain.p2"), t("featurePosts.explain.p3")]}
      imageSrc="/landing/explainer/ex-funnel.jpg"
      imageAlt={t("featurePosts.explain.title")}
      igSrc="/landing/explainer/ig-post.jpg"
      igLabel={t("featurePosts.igLabel")}
    />
  );
}
