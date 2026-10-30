import type { MetadataRoute } from "next";
import {
  listPublishedBlogPostsForSitemap,
  PUBLIC_BLOG_PAGE_SIZE,
} from "@/service/blog-post/blog-posts";
import { getSiteUrl } from "@/util/app-url";
import { absolutePublicUrl, sitemapLanguageAlternates } from "@/util/seo/public-metadata";

// Refresh sitemap entries so newly published blog posts appear promptly.
export const dynamic = "force-dynamic";

type StaticRouteConfig = {
  path: string;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
  priority: number;
};

export const PUBLIC_STATIC_SITEMAP_ROUTES: StaticRouteConfig[] = [
  { path: "/", changeFrequency: "daily", priority: 1.0 },
  { path: "/ai-influencer", changeFrequency: "weekly", priority: 0.9 },
  { path: "/product-promo", changeFrequency: "weekly", priority: 0.9 },
  { path: "/talking-head", changeFrequency: "weekly", priority: 0.9 },
  { path: "/cantonese", changeFrequency: "weekly", priority: 0.9 },
  { path: "/explainer", changeFrequency: "weekly", priority: 0.9 },
  { path: "/right-tool", changeFrequency: "weekly", priority: 0.9 },
  { path: "/pricing", changeFrequency: "weekly", priority: 0.85 },
  { path: "/examples", changeFrequency: "weekly", priority: 0.8 },
  { path: "/posts", changeFrequency: "daily", priority: 0.85 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.6 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
];

function listingPath(page: number): string {
  return page <= 1 ? "/posts" : `/posts?page=${page}`;
}

// Build sitemap entries from static public routes, post listing pages, and every published post.
// Static lastmod is omitted: stamping "now" on every crawl makes unchanged pages look edited.
export function buildSitemapEntries(
  siteUrl: string,
  posts: Array<{ slug: string; updatedAt: string }> = [],
  pageSize = PUBLIC_BLOG_PAGE_SIZE,
): MetadataRoute.Sitemap {
  const staticEntries: MetadataRoute.Sitemap = PUBLIC_STATIC_SITEMAP_ROUTES.map((route) => ({
    url: absolutePublicUrl(siteUrl, route.path),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
    alternates: { languages: sitemapLanguageAlternates(siteUrl, route.path) },
  }));

  const totalPages = Math.max(1, Math.ceil(posts.length / Math.max(1, pageSize)));
  const listingEntries: MetadataRoute.Sitemap = [];
  for (let page = 2; page <= totalPages; page += 1) {
    const path = listingPath(page);
    listingEntries.push({
      url: absolutePublicUrl(siteUrl, path),
      changeFrequency: "daily",
      priority: 0.4,
      alternates: { languages: sitemapLanguageAlternates(siteUrl, path) },
    });
  }

  const postEntries: MetadataRoute.Sitemap = posts.map((post) => {
    const modified = new Date(post.updatedAt);
    return {
      url: absolutePublicUrl(siteUrl, `/posts/${encodeURIComponent(post.slug)}`),
      ...(Number.isNaN(modified.getTime()) ? {} : { lastModified: modified }),
      changeFrequency: "weekly" as const,
      priority: 0.75,
    };
  });

  return [...staticEntries, ...listingEntries, ...postEntries];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  let posts: Array<{ slug: string; updatedAt: string }> = [];

  try {
    posts = await listPublishedBlogPostsForSitemap();
  } catch (error) {
    // Fallback to static routes if MongoDB is temporarily unreachable at build or crawl time.
    console.warn("sitemap: failed to load blog posts", error);
  }

  return buildSitemapEntries(siteUrl, posts);
}
