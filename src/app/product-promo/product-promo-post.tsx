"use client";

import { FeaturePost } from "@/presentation/components/feature-post";
import { useI18n } from "@/presentation/components/i18n-provider";

// Editorial post for the product promo feature page.
export function ProductPromoPost() {
  const { t } = useI18n();
  return (
    <FeaturePost
      eyebrow={t("featurePosts.eyebrow")}
      title={t("featurePosts.promo.title")}
      lede={t("featurePosts.promo.lede")}
      paragraphs={[t("featurePosts.promo.p1"), t("featurePosts.promo.p2"), t("featurePosts.promo.p3")]}
      imageSrc="/landing/product-promo/ex-serum.jpg"
      imageAlt={t("featurePosts.promo.title")}
      igSrc="/landing/product-promo/ig-post.jpg"
      igLabel={t("featurePosts.igLabel")}
    />
  );
}
