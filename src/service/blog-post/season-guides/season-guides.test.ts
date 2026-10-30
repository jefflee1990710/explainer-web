import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CHRISTMAS_SPECS, renderChristmasSpec } from "@/service/blog-post/christmas-guides";
import { HALLOWEEN_SPECS } from "@/service/blog-post/halloween-guides";
import { IMAGE_TIP_SPECS } from "@/service/blog-post/image-tips";
import { isPartnerIntroPost } from "@/service/blog-post/indexable";
import { KEYWORD_SPECS } from "@/service/blog-post/keyword-guides";
import { LUNAR_NEW_YEAR_SPECS, renderLunarNewYearSpec } from "@/service/blog-post/lunar-new-year-guides";
import { NEW_YEAR_SPECS, renderNewYearSpec } from "@/service/blog-post/new-year-guides";
import { SEARCH_GUIDES } from "@/service/blog-post/search-guides";
import type { SeasonGuideSpec } from "@/service/blog-post/season-guides/types";
import { slugifyBlogPost } from "@/service/blog-post/slug";
import { postDocumentTitle } from "@/util/seo/public-metadata";

const PRIOR_SLUGS = new Set([
  ...SEARCH_GUIDES.map((guide) => guide.slug),
  ...KEYWORD_SPECS.map((spec) => spec.slug),
  ...IMAGE_TIP_SPECS.map((spec) => spec.slug),
  ...HALLOWEEN_SPECS.map((spec) => spec.slug),
]);

const PRIOR_TITLES = new Set([
  ...SEARCH_GUIDES.map((guide) => guide.title),
  ...KEYWORD_SPECS.map((spec) => spec.title),
  ...IMAGE_TIP_SPECS.map((spec) => spec.title),
  ...HALLOWEEN_SPECS.map((spec) => spec.title),
]);

function assertBatch(
  name: string,
  specs: SeasonGuideSpec[],
  render: (spec: SeasonGuideSpec) => string,
  options: { locale: "en" | "zh-Hant"; tag: string; minimum: number },
) {
  assert.equal(specs.length, 100, name);
  const ids = specs.map((spec) => spec.id);
  assert.deepEqual(ids, Array.from({ length: 100 }, (_, index) => index + 1), name);
  const slugs = new Set<string>();
  const titles = new Set<string>();
  for (const spec of specs) {
    assert.equal(spec.locale, options.locale, spec.slug);
    assert.equal(slugifyBlogPost(spec.slug), spec.slug, spec.slug);
    assert.equal(slugs.has(spec.slug), false, spec.slug);
    assert.equal(PRIOR_SLUGS.has(spec.slug), false, spec.slug);
    slugs.add(spec.slug);
    assert.equal(titles.has(spec.title), false, spec.title);
    assert.equal(PRIOR_TITLES.has(spec.title), false, spec.title);
    titles.add(spec.title);
    assert.equal(isPartnerIntroPost(spec), false, spec.title);
    assert.equal(/^Introducing\s/i.test(spec.title), false, spec.title);
    assert.equal(spec.tags.includes(options.tag), true, spec.slug);
    assert.equal(spec.landingPath.startsWith("/"), true, spec.slug);
    assert.equal(spec.landingPath.includes("://"), false, spec.slug);
    if (options.locale === "zh-Hant") {
      assert.ok(spec.landingPath.includes("hl=zh-Hant"), spec.slug);
    } else {
      assert.equal(spec.landingPath.includes("hl="), false, spec.slug);
    }
    const content = render(spec);
    assert.ok(content.length > options.minimum, `${spec.slug} content ${content.length}`);
    assert.ok(content.includes(`](${spec.landingPath})`), spec.slug);
    assert.ok(content.includes("/examples"), spec.slug);
    assert.equal(/higgsfield/i.test(content), false, spec.slug);
    assert.equal(/2 minutes/i.test(content), false, spec.slug);
    assert.ok(
      spec.excerpt.length >= 40 && spec.excerpt.length <= 180,
      `${spec.slug} excerpt ${spec.excerpt.length}: ${spec.excerpt}`,
    );
    const branded = postDocumentTitle(spec.title);
    assert.match(branded, /\| Scro$/, `${spec.slug} title became ${branded}`);
    assert.ok(spec.scene.length > 20, spec.slug);
    assert.equal(spec.points.length >= 3, true, spec.slug);
    assert.equal(spec.checks.length, 3, spec.slug);
    if (options.locale === "zh-Hant") {
      assert.match(content, /[嘅喺係]|點樣|唔使/, spec.slug);
    }
  }
}

describe("season guides", () => {
  it("publishes 100 English Christmas guides", () => {
    assertBatch("christmas", CHRISTMAS_SPECS, renderChristmasSpec, {
      locale: "en",
      tag: "Christmas",
      minimum: 3000,
    });
  });

  it("publishes 100 Cantonese New Year Eve guides", () => {
    assertBatch("new-year", NEW_YEAR_SPECS, renderNewYearSpec, {
      locale: "zh-Hant",
      tag: "New Year",
      minimum: 1800,
    });
  });

  it("publishes 100 Cantonese Lunar New Year guides", () => {
    assertBatch("lunar", LUNAR_NEW_YEAR_SPECS, renderLunarNewYearSpec, {
      locale: "zh-Hant",
      tag: "Lunar New Year",
      minimum: 1800,
    });
  });

  it("keeps the three seasons on different slugs and titles", () => {
    const slugs = [
      ...CHRISTMAS_SPECS.map((spec) => spec.slug),
      ...NEW_YEAR_SPECS.map((spec) => spec.slug),
      ...LUNAR_NEW_YEAR_SPECS.map((spec) => spec.slug),
    ];
    assert.equal(new Set(slugs).size, slugs.length);
    const titles = [
      ...CHRISTMAS_SPECS.map((spec) => spec.title),
      ...NEW_YEAR_SPECS.map((spec) => spec.title),
      ...LUNAR_NEW_YEAR_SPECS.map((spec) => spec.title),
    ];
    assert.equal(new Set(titles).size, titles.length);
  });
});
