import type { MetadataRoute } from "next";
import { listPublishedBlogPosts } from "@/service/blog-post/blog-posts";
import { getSiteUrl } from "@/util/app-url";

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

// Build sitemap entries from static public routes and published blog posts.
export function buildSitemapEntries(
  siteUrl: string,
  posts: Array<{ slug: string; updatedAt: string }> = [],
  now = new Date(),
): MetadataRoute.Sitemap {
  const staticEntries: MetadataRoute.Sitemap = PUBLIC_STATIC_SITEMAP_ROUTES.map((route) => ({
    url: route.path === "/" ? siteUrl : `${siteUrl}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const postEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${siteUrl}/posts/${encodeURIComponent(post.slug)}`,
    lastModified: new Date(post.updatedAt || now),
    changeFrequency: "weekly",
    priority: 0.75,
  }));

  return [...staticEntries, ...postEntries];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  let posts: Array<{ slug: string; updatedAt: string }> = [];

  try {
    posts = await listPublishedBlogPosts(500);
  } catch (error) {
    // Fallback to static routes if MongoDB is temporarily unreachable at build or crawl time.
    console.warn("sitemap: failed to load blog posts", error);
  }

  return buildSitemapEntries(siteUrl, posts);
}
