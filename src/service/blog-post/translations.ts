import { BLOG_LOCALES, type BlogLocale } from "@/model/blog-post";

export { BLOG_LOCALES, type BlogLocale };

const LANGUAGE_LABEL: Record<BlogLocale, string> = {
  en: "English",
  "zh-Hant": "繁體中文",
  "zh-Hans": "简体中文",
};

export function isBlogLocale(value: string | undefined): value is BlogLocale {
  return BLOG_LOCALES.some((locale) => locale === value);
}

export function blogLocaleLabel(locale: BlogLocale): string {
  return LANGUAGE_LABEL[locale];
}

function postPath(slug: string): string {
  return `/posts/${encodeURIComponent(slug)}`;
}

// hreflang only when a different article exists. A lone English post does not point at itself.
export function blogPostLanguageAlternates(post: {
  slug: string;
  locale?: string;
  translations?: Partial<Record<BlogLocale, string>>;
}): Record<string, string> | undefined {
  const locale = isBlogLocale(post.locale) ? post.locale : "en";
  const translations = post.translations ?? {};
  const languages: Record<string, string> = {
    [locale]: postPath(post.slug),
  };
  for (const code of BLOG_LOCALES) {
    if (code === locale) continue;
    const slug = translations[code]?.trim();
    if (!slug || slug === post.slug) continue;
    languages[code] = postPath(slug);
  }
  if (Object.keys(languages).length < 2) return undefined;
  const englishSlug = locale === "en" ? post.slug : translations.en?.trim();
  if (englishSlug) languages["x-default"] = postPath(englishSlug);
  return languages;
}

function safeLandingPath(value: string | undefined): string | undefined {
  const path = value?.trim() ?? "";
  if (!path.startsWith("/") || path.startsWith("//")) return undefined;
  if (path.includes("://") || path.includes("\\")) return undefined;
  return path;
}

function looksCantonese(post: { title: string; tags: string[] }): boolean {
  const haystack = `${post.title} ${post.tags.join(" ")}`;
  return /cantonese|粵語|廣東話|广东话|\byue\b/i.test(haystack);
}

// Explicit landingPath wins. A Cantonese article without one still links to the Cantonese studio.
export function resolveBlogLandingPath(post: {
  title: string;
  tags: string[];
  locale?: string;
  landingPath?: string;
}): string | undefined {
  const explicit = safeLandingPath(post.landingPath);
  if (explicit) return explicit;
  const locale = isBlogLocale(post.locale) ? post.locale : "en";
  if (locale === "zh-Hant" && looksCantonese(post)) return "/cantonese?hl=zh-Hant";
  return undefined;
}
