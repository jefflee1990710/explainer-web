import type { Metadata } from "next";
import { DEFAULT_LOCALE, PRIMARY_LOCALE_IDS, type LocaleId } from "@/util/i18n/locales";

// Open Graph locale tags use underscores. hreflang keeps the BCP-47 locale id.
const OPEN_GRAPH_LOCALE: Record<LocaleId, string> = {
  en: "en_US",
  "zh-Hant": "zh_TW",
  "zh-Hans": "zh_CN",
  ja: "ja_JP",
  ko: "ko_KR",
  es: "es_ES",
  fr: "fr_FR",
  de: "de_DE",
  pt: "pt_PT",
  ru: "ru_RU",
  id: "id_ID",
};

export const SOCIAL_IMAGE_PATH = "/opengraph-image";

const POST_TITLE_MAX = 60;

export function openGraphLocale(locale: LocaleId): string {
  return OPEN_GRAPH_LOCALE[locale];
}

// English stays on the clean path. Other UI languages use ?hl= so each translation has its own URL.
export function localePath(path: string, locale: LocaleId): string {
  const url = new URL(path || "/", "https://www.scro.io");
  if (locale === DEFAULT_LOCALE) url.searchParams.delete("hl");
  else url.searchParams.set("hl", locale);
  const qs = url.searchParams.toString();
  return qs ? `${url.pathname}?${qs}` : url.pathname;
}

export function absolutePublicUrl(siteUrl: string, path: string): string {
  const base = siteUrl.replace(/\/$/, "");
  if (path === "/" || path === "") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

// hreflang set for the five languages in the switcher, plus x-default on the English URL.
export function publicAlternates(path: string, locale: LocaleId): NonNullable<Metadata["alternates"]> {
  const languages: Record<string, string> = {
    "x-default": localePath(path, DEFAULT_LOCALE),
  };
  for (const id of PRIMARY_LOCALE_IDS) {
    languages[id] = localePath(path, id);
  }
  return {
    canonical: localePath(path, locale),
    languages,
  };
}

export function sitemapLanguageAlternates(siteUrl: string, path: string): Record<string, string> {
  const languages = publicAlternates(path, DEFAULT_LOCALE).languages ?? {};
  const entries: Array<[string, string]> = [];
  for (const [code, href] of Object.entries(languages)) {
    if (typeof href === "string") entries.push([code, absolutePublicUrl(siteUrl, href)]);
  }
  return Object.fromEntries(entries);
}

export function socialImage(alt: string): NonNullable<Metadata["openGraph"]>["images"] {
  return [{ url: SOCIAL_IMAGE_PATH, width: 1200, height: 630, alt }];
}

// Shared head tags for an indexable public page: canonical, hreflang, and a 1200×630 share image.
export function publicPageMetadata(args: {
  title: string;
  description: string;
  path: string;
  locale: LocaleId;
  index?: boolean;
}): Metadata {
  const index = args.index !== false;
  const canonical = index ? localePath(args.path, args.locale) : args.path;
  return {
    title: args.title,
    description: args.description,
    alternates: index ? publicAlternates(args.path, args.locale) : { canonical },
    ...(index ? {} : { robots: { index: false, follow: true } }),
    openGraph: {
      title: args.title,
      description: args.description,
      url: canonical,
      siteName: "Scro",
      type: "website",
      locale: openGraphLocale(args.locale),
      images: socialImage(args.title),
    },
    twitter: {
      card: "summary_large_image",
      title: args.title,
      description: args.description,
      images: [SOCIAL_IMAGE_PATH],
    },
  };
}

// Keep the document title inside a typical search-result width. The on-page h1 stays the full title.
export function postDocumentTitle(title: string): string {
  const clean = title.replace(/\s+/g, " ").trim().replace(/\s+\|\s+Scro$/, "");
  if (!clean) return "Scro";
  const branded = `${clean} | Scro`;
  if (branded.length <= POST_TITLE_MAX) return branded;
  if (clean.length <= POST_TITLE_MAX) return clean;
  const slice = clean.slice(0, POST_TITLE_MAX - 1);
  const space = slice.lastIndexOf(" ");
  const base = (space >= 40 ? slice.slice(0, space) : slice).trimEnd();
  return `${base}…`;
}
