"use client";

import { FeaturePost } from "@/presentation/components/feature-post";
import { useI18n } from "@/presentation/components/i18n-provider";

// Editorial post for the talking-head feature page.
export function TalkingHeadPost() {
  const { t } = useI18n();
  return (
    <FeaturePost
      eyebrow={t("featurePosts.eyebrow")}
      title={t("featurePosts.talk.title")}
      lede={t("featurePosts.talk.lede")}
      paragraphs={[t("featurePosts.talk.p1"), t("featurePosts.talk.p2"), t("featurePosts.talk.p3")]}
      imageSrc="/landing/talking-head/ex-room.jpg"
      imageAlt={t("featurePosts.talk.title")}
      igSrc="/landing/talking-head/ig-post.jpg"
      igLabel={t("featurePosts.igLabel")}
    />
  );
}
