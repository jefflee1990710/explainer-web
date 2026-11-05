import assert from "node:assert/strict";
import test from "node:test";
import { indexablePublishedFilter, isPartnerIntroPost } from "@/service/blog-post/indexable";
import {
  blogPostLanguageAlternates,
  resolveBlogLandingPath,
} from "@/service/blog-post/translations";

test("all published posts including partner intros are indexable and included in public filter", () => {
  assert.equal(isPartnerIntroPost({ title: "Introducing FlexClip", tags: [] }), false);
  assert.equal(isPartnerIntroPost({ title: "A real guide", tags: ["Partner Intro"] }), false);
  assert.equal(isPartnerIntroPost({ title: "How to storyboard a reel", tags: ["Explainer"] }), false);
  assert.equal(isPartnerIntroPost({ title: "Your introduction to hooks", tags: ["SEO Guide"] }), false);
  assert.deepEqual(indexablePublishedFilter(), { published: true });
});

test("hreflang is omitted until a real translation sibling exists", () => {
  assert.equal(
    blogPostLanguageAlternates({ slug: "english-only", locale: "en" }),
    undefined,
  );
  assert.equal(
    blogPostLanguageAlternates({
      slug: "english-only",
      locale: "en",
      translations: { en: "english-only" },
    }),
    undefined,
  );
  assert.deepEqual(
    blogPostLanguageAlternates({
      slug: "cantonese-sme-reels",
      locale: "zh-Hant",
      translations: { en: "cantonese-sme-reels-en" },
    }),
    {
      "zh-Hant": "/posts/cantonese-sme-reels",
      en: "/posts/cantonese-sme-reels-en",
      "x-default": "/posts/cantonese-sme-reels-en",
    },
  );
});

test("resolveBlogLandingPath maps every article to its matching product landing page and rejects off-site URLs", () => {
  assert.equal(
    resolveBlogLandingPath({
      title: "香港中小企點樣拍粵語口播",
      tags: ["Cantonese"],
      locale: "zh-Hant",
    }),
    "/cantonese?hl=zh-Hant",
  );
  assert.equal(
    resolveBlogLandingPath({
      title: "How to storyboard a whiteboard reel",
      tags: ["Explainer"],
      locale: "en",
    }),
    "/explainer",
  );
  assert.equal(
    resolveBlogLandingPath({
      title: "Best AI talking-head generator with captions",
      tags: ["Talking Head"],
      locale: "en",
    }),
    "/talking-head",
  );
  assert.equal(
    resolveBlogLandingPath({
      title: "How DTC brands shoot product UGC ads",
      tags: ["Product Promo", "UGC"],
      locale: "en",
    }),
    "/product-promo",
  );
  assert.equal(
    resolveBlogLandingPath({
      title: "Building a virtual KOL and AI influencer",
      tags: ["AI Influencer"],
      locale: "en",
    }),
    "/ai-influencer",
  );
  assert.equal(
    resolveBlogLandingPath({
      title: "Talking-head captions",
      tags: [],
      locale: "en",
      landingPath: "/talking-head",
    }),
    "/talking-head",
  );
  assert.equal(
    resolveBlogLandingPath({
      title: "Off site",
      tags: [],
      locale: "en",
      landingPath: "https://evil.example/phish",
    }),
    "/right-tool",
  );
});
