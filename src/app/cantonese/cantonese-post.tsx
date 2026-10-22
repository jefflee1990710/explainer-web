"use client";

import { FeaturePost } from "@/presentation/components/feature-post";
import { useI18n } from "@/presentation/components/i18n-provider";

// Editorial post for the Cantonese feature page.
export function CantonesePost() {
  const { t } = useI18n();
  return (
    <FeaturePost
      eyebrow={t("featurePosts.eyebrow")}
      title={t("featurePosts.canto.title")}
      lede={t("featurePosts.canto.lede")}
      paragraphs={[t("featurePosts.canto.p1"), t("featurePosts.canto.p2"), t("featurePosts.canto.p3")]}
      imageSrc="/landing/cantonese/ex-cafe.jpg"
      imageAlt={t("featurePosts.canto.title")}
      igSrc="/landing/cantonese/ig-post.jpg"
      igLabel={t("featurePosts.igLabel")}
    />
  );
}
