import assert from "node:assert/strict";
import test from "node:test";
import { isPartnerIntroPost } from "@/service/blog-post/indexable";
import {
  blogPostLanguageAlternates,
  resolveBlogLandingPath,
} from "@/service/blog-post/translations";

test("partner intros are the Partner Intro tag or an Introducing title", () => {
  assert.equal(isPartnerIntroPost({ title: "Introducing FlexClip", tags: [] }), true);
  assert.equal(isPartnerIntroPost({ title: "A real guide", tags: ["Partner Intro"] }), true);
  assert.equal(isPartnerIntroPost({ title: "How to storyboard a reel", tags: ["Explainer"] }), false);
  assert.equal(isPartnerIntroPost({ title: "Your introduction to hooks", tags: ["SEO Guide"] }), false);
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

test("Cantonese articles link to the Cantonese studio, other posts do not invent one", () => {
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
      title: "How to storyboard a reel",
      tags: ["Explainer"],
      locale: "en",
    }),
    undefined,
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
      landingPath: "https://evil.example/phish",
    }),
    undefined,
  );
});
