import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/util/app-url";

// Private studio routes, auth flows, API routes, and referral redirects are excluded from search & AI indexing.
const DISALLOWED_PATHS = [
  "/app/",
  "/api/",
  "/sign-in",
  "/sign-up",
  "/checkout/",
  "/legal/accept",
  "/affiliate",
  "/r/",
  "/_freesound/",
];

const AI_CRAWLER_AGENTS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "GoogleOther",
  "Applebot-Extended",
  "CCBot",
  "Cohere-ai",
  "YouBot",
];

// Generate robots.txt with explicit rules for search engines and AI/LLM crawlers, plus sitemap pointer.
export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: DISALLOWED_PATHS,
      },
      {
        userAgent: AI_CRAWLER_AGENTS,
        allow: ["/", "/llms.txt", "/llms-full.txt"],
        disallow: DISALLOWED_PATHS,
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
