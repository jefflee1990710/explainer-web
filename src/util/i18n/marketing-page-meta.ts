import { getMessages } from "@/util/i18n";
import { getRequestLocale } from "@/util/i18n/request-locale";
import {
  KEY_TO_PATH,
  type MarketingPageKey,
} from "@/util/i18n/marketing-seo-paths";
import { publicPageMetadata } from "@/util/seo/public-metadata";

export type { MarketingPageKey } from "@/util/i18n/marketing-seo-paths";

// Per-feature SEO for Google organic + paid ads landing pages.
export async function marketingPageMetadata(key: MarketingPageKey) {
  const locale = await getRequestLocale();
  const seo = getMessages(locale)[key].seo;
  return publicPageMetadata({
    title: seo.title,
    description: seo.description,
    path: KEY_TO_PATH[key],
    locale,
  });
}
