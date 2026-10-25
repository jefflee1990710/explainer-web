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
});

test("buildSitemapEntries includes all static public pages and published blog posts", () => {
  const entries = buildSitemapEntries("https://scro.io", [
    { slug: "ai-influencer-guide", updatedAt: "2026-10-20T00:00:00.000Z" },
  ]);
  assert.equal(entries.length, PUBLIC_STATIC_SITEMAP_ROUTES.length + 1);
  assert.equal(entries[0]?.url, "https://scro.io");
  assert.ok(entries.some((e) => e.url === "https://scro.io/ai-influencer"));
  assert.ok(entries.some((e) => e.url === "https://scro.io/pricing"));
  assert.ok(entries.some((e) => e.url === "https://scro.io/academy"));
  assert.ok(
    entries.some((e) => e.url === "https://scro.io/posts/ai-influencer-guide"),
  );
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
  const shortTxt = buildLlmsTxt("https://scro.io", samplePosts);
  assert.ok(shortTxt.startsWith("# Scro"));
  assert.ok(shortTxt.includes("https://scro.io/llms-full.txt"));
  assert.ok(shortTxt.includes("[AI Influencer Studio](https://scro.io/ai-influencer)"));
  assert.ok(shortTxt.includes("[Cantonese Reel Tips](https://scro.io/posts/cantonese-reel-tips)"));

  const fullTxt = buildLlmsFullTxt("https://scro.io", samplePosts);
  assert.ok(fullTxt.startsWith("# Scro — Full Documentation for LLMs & AI Agents"));
  assert.ok(fullTxt.includes("POST https://scro.io/api/mcp"));
  assert.ok(fullTxt.includes("https://scro.io/posts/cantonese-reel-tips"));
});
