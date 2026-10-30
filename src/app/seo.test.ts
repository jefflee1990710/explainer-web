import assert from "node:assert/strict";
import { test } from "node:test";
import robots from "@/app/robots";
import { buildSitemapEntries, PUBLIC_STATIC_SITEMAP_ROUTES } from "@/app/sitemap";
import { buildLlmsFullTxt, buildLlmsTxt } from "@/presentation/api/llms/route";

test("robots() returns sitemap URL, host, and disallows private workspace paths", () => {
  const result = robots();
  assert.ok(result.sitemap?.toString().endsWith("/sitemap.xml"));
  assert.ok(Array.isArray(result.rules));
  const starRule = Array.isArray(result.rules)
    ? result.rules.find((r) => r.userAgent === "*")
    : result.rules;
  assert.ok(starRule);
  assert.ok(Array.isArray(starRule.disallow));
  assert.ok(starRule.disallow.includes("/app/"));
  assert.ok(starRule.disallow.includes("/api/"));
  assert.ok(starRule.disallow.includes("/scroadmin"));
  assert.ok(starRule.disallow.includes("/academy"));
});

test("buildSitemapEntries includes all static public pages and published blog posts without 100-item truncation", () => {
  const manyPosts = Array.from({ length: 900 }, (_, i) => ({
    slug: `post-${i + 1}`,
    updatedAt: "2026-10-20T00:00:00.000Z",
  }));
  const entries = buildSitemapEntries("https://www.scro.io", [
    { slug: "ai-influencer-guide", updatedAt: "2026-10-20T00:00:00.000Z" },
    ...manyPosts,
  ]);
  const listingPages = Math.ceil(901 / 12) - 1;
  assert.equal(entries.length, PUBLIC_STATIC_SITEMAP_ROUTES.length + listingPages + 901);
  assert.equal(entries[0]?.url, "https://www.scro.io");
  assert.equal(entries[0]?.lastModified, undefined);
  assert.equal(entries[0]?.alternates?.languages?.["zh-Hant"], "https://www.scro.io/?hl=zh-Hant");
  assert.equal(entries[0]?.alternates?.languages?.["x-default"], "https://www.scro.io");
  assert.ok(entries.some((e) => e.url === "https://www.scro.io/ai-influencer"));
  assert.ok(entries.some((e) => e.url === "https://www.scro.io/pricing"));
  const page2 = entries.find((e) => e.url === "https://www.scro.io/posts?page=2");
  assert.ok(page2);
  assert.equal(
    page2.alternates?.languages?.["zh-Hant"],
    "https://www.scro.io/posts?page=2&amp;hl=zh-Hant",
  );
  // Every URL and hreflang link in the sitemap must be XML-safe (no raw '&' that breaks XML parsers).
  for (const entry of entries) {
    assert.doesNotMatch(entry.url, /&(?!amp;|lt;|gt;|quot;|apos;)/);
    for (const href of Object.values(entry.alternates?.languages ?? {})) {
      assert.doesNotMatch(String(href), /&(?!amp;|lt;|gt;|quot;|apos;)/);
    }
  }
  assert.ok(entries.some((e) => e.url === "https://www.scro.io/posts?page=76"));
  assert.equal(entries.some((e) => e.url === "https://www.scro.io/posts?page=77"), false);
  assert.equal(entries.some((e) => e.url === "https://www.scro.io/academy"), false);
  assert.ok(
    entries.some((e) => e.url === "https://www.scro.io/posts/ai-influencer-guide"),
  );
  const oldest = entries.find((e) => e.url === "https://www.scro.io/posts/post-900");
  assert.ok(oldest);
  assert.equal(oldest.alternates, undefined);
  assert.ok(oldest.lastModified instanceof Date);
});

test("buildLlmsTxt and buildLlmsFullTxt output valid markdown with core URLs and posts", () => {
  const samplePosts = [
    {
      slug: "cantonese-reel-tips",
      title: "Cantonese Reel Tips",
      excerpt: "How Hong Kong SMEs create talking-head videos.",
      tags: ["Cantonese", "SME"],
    },
  ];
  const shortTxt = buildLlmsTxt("https://www.scro.io", samplePosts);
  assert.ok(shortTxt.startsWith("# Scro"));
  assert.ok(shortTxt.includes("https://www.scro.io/llms-full.txt"));
  assert.ok(shortTxt.includes("[AI Influencer Studio](https://www.scro.io/ai-influencer)"));
  assert.ok(shortTxt.includes("[Cantonese Reel Tips](https://www.scro.io/posts/cantonese-reel-tips)"));
  assert.equal(shortTxt.includes("/academy"), false);

  const fullTxt = buildLlmsFullTxt("https://www.scro.io", samplePosts);
  assert.ok(fullTxt.startsWith("# Scro — Full Documentation for LLMs & AI Agents"));
  assert.ok(fullTxt.includes("POST https://www.scro.io/api/mcp"));
  assert.ok(fullTxt.includes("https://www.scro.io/posts/cantonese-reel-tips"));
  assert.ok(fullTxt.includes("`https://www.scro.io`"));
  assert.equal(fullTxt.includes("`https://scro.io`"), false);
  assert.equal(fullTxt.includes("/academy"), false);
});
