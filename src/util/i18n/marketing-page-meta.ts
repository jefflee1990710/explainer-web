import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  DEFAULT_LOCALE,
  getMessages,
  isLocaleId,
  LOCALE_STORAGE_KEY,
  type LocaleId,
} from "@/util/i18n";
import {
  KEY_TO_PATH,
  type MarketingPageKey,
} from "@/util/i18n/marketing-seo-paths";

export type { MarketingPageKey } from "@/util/i18n/marketing-seo-paths";

async function localeFromCookie(): Promise<LocaleId> {
  const jar = await cookies();
  const stored = jar.get(LOCALE_STORAGE_KEY)?.value;
  return isLocaleId(stored) ? stored : DEFAULT_LOCALE;
}

// Per-feature SEO for Google organic + paid ads landing pages.
export async function marketingPageMetadata(key: MarketingPageKey): Promise<Metadata> {
  const locale = await localeFromCookie();
  const messages = getMessages(locale);
  const seo = messages[key].seo;
  const canonicalPath = KEY_TO_PATH[key];
  return {
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: canonicalPath,
      siteName: "Scro",
      type: "website",
      locale,
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
    },
  };
}
