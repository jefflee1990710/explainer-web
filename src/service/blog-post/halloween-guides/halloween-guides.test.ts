import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HALLOWEEN_SPECS, renderHalloweenSpec } from "@/service/blog-post/halloween-guides";
import { IMAGE_TIP_SPECS } from "@/service/blog-post/image-tips";
import { isPartnerIntroPost } from "@/service/blog-post/indexable";
import { KEYWORD_SPECS } from "@/service/blog-post/keyword-guides";
import { SEARCH_GUIDES } from "@/service/blog-post/search-guides";
import { slugifyBlogPost } from "@/service/blog-post/slug";
import { postDocumentTitle } from "@/util/seo/public-metadata";

describe("halloween guides", () => {
  it("publishes 10 Cantonese Halloween guides", () => {
    assert.equal(HALLOWEEN_SPECS.length, 10);
    const ids = HALLOWEEN_SPECS.map((spec) => spec.id);
    assert.deepEqual(ids, Array.from({ length: 10 }, (_, index) => index + 1));
    const slugs = new Set<string>();
    const titles = new Set<string>();
    const taken = new Set([
      ...SEARCH_GUIDES.map((guide) => guide.slug),
      ...KEYWORD_SPECS.map((spec) => spec.slug),
      ...IMAGE_TIP_SPECS.map((spec) => spec.slug),
    ]);
    const takenTitles = new Set([
      ...SEARCH_GUIDES.map((guide) => guide.title),
      ...KEYWORD_SPECS.map((spec) => spec.title),
      ...IMAGE_TIP_SPECS.map((spec) => spec.title),
    ]);
    for (const spec of HALLOWEEN_SPECS) {
      assert.equal(spec.locale, "zh-Hant", spec.slug);
      assert.equal(slugifyBlogPost(spec.slug), spec.slug, spec.slug);
      assert.equal(slugs.has(spec.slug), false, spec.slug);
      assert.equal(taken.has(spec.slug), false, spec.slug);
      slugs.add(spec.slug);
      assert.equal(titles.has(spec.title), false, spec.title);
      assert.equal(takenTitles.has(spec.title), false, spec.title);
      titles.add(spec.title);
      assert.equal(isPartnerIntroPost(spec), false, spec.title);
      assert.equal(spec.tags.includes("Halloween"), true, spec.slug);
      const content = renderHalloweenSpec(spec);
      assert.ok(content.length > 700, `${spec.slug} content ${content.length}`);
      assert.ok(content.includes(`](${spec.landingPath})`), spec.slug);
      assert.ok(
        spec.excerpt.length >= 40 && spec.excerpt.length <= 180,
        `${spec.slug} excerpt ${spec.excerpt.length}: ${spec.excerpt}`,
      );
      assert.match(postDocumentTitle(spec.title), /\| Scro$/, spec.slug);
      assert.ok(spec.scene.length > 20, spec.slug);
      assert.equal(spec.points.length >= 3, true, spec.slug);
      if (spec.figure) {
        assert.equal(spec.figure.alt.includes("]"), false, spec.slug);
        assert.ok(content.includes(`![${spec.figure.alt}](`), spec.slug);
      }
    }
  });
});
