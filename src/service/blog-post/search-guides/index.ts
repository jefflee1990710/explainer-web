import type { BlogLocale } from "@/model/blog-post";
import { EN_SEARCH_GUIDES } from "@/service/blog-post/search-guides/en";
import type { SearchGuide } from "@/service/blog-post/search-guides/types";
import { ZH_HANS_SEARCH_GUIDES } from "@/service/blog-post/search-guides/zh-hans";
import { ZH_HANT_SEARCH_GUIDES } from "@/service/blog-post/search-guides/zh-hant";

export type { SearchGuide } from "@/service/blog-post/search-guides/types";

// Six search intents, each published in English, Traditional Chinese, and Simplified Chinese.
export const SEARCH_GUIDES: SearchGuide[] = [
  ...EN_SEARCH_GUIDES,
  ...ZH_HANT_SEARCH_GUIDES,
  ...ZH_HANS_SEARCH_GUIDES,
];

// Other locales in the same group. The post does not list itself.
export function translationMap(guide: SearchGuide): Partial<Record<BlogLocale, string>> {
  const siblings = SEARCH_GUIDES.filter(
    (item) => item.group === guide.group && item.locale !== guide.locale,
  );
  return Object.fromEntries(siblings.map((item) => [item.locale, item.slug]));
}
