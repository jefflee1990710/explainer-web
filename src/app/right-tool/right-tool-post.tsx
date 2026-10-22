"use client";

import { FeaturePost } from "@/presentation/components/feature-post";
import { useI18n } from "@/presentation/components/i18n-provider";

// Editorial post for the right-tool feature page.
export function RightToolPost() {
  const { t } = useI18n();
  return (
    <FeaturePost
      eyebrow={t("featurePosts.eyebrow")}
      title={t("featurePosts.tool.title")}
      lede={t("featurePosts.tool.lede")}
      paragraphs={[t("featurePosts.tool.p1"), t("featurePosts.tool.p2"), t("featurePosts.tool.p3")]}
      imageSrc="/landing/right-tool/ex-talk.jpg"
      imageAlt={t("featurePosts.tool.title")}
      igSrc="/landing/right-tool/ig-post.jpg"
      igLabel={t("featurePosts.igLabel")}
    />
  );
}
