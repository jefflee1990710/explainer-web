import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { IMAGE_TIP_SPECS, renderImageTipSpec } from "@/service/blog-post/image-tips";
import { KEYWORD_SPECS } from "@/service/blog-post/keyword-guides";
import { isPartnerIntroPost } from "@/service/blog-post/indexable";
import { SEARCH_GUIDES } from "@/service/blog-post/search-guides";
import { slugifyBlogPost } from "@/service/blog-post/slug";
import { postDocumentTitle } from "@/util/seo/public-metadata";

describe("image tips", () => {
  it("publishes 50 unique craft tips", () => {
    assert.equal(IMAGE_TIP_SPECS.length, 50);
    const ids = IMAGE_TIP_SPECS.map((spec) => spec.id);
    assert.deepEqual(ids, Array.from({ length: 50 }, (_, index) => index + 1));
    const slugs = new Set<string>();
    const titles = new Set<string>();
    const taken = new Set([
      ...SEARCH_GUIDES.map((guide) => guide.slug),
      ...KEYWORD_SPECS.map((spec) => spec.slug),
    ]);
    const takenTitles = new Set([
      ...SEARCH_GUIDES.map((guide) => guide.title),
      ...KEYWORD_SPECS.map((spec) => spec.title),
    ]);
    for (const spec of IMAGE_TIP_SPECS) {
      assert.equal(slugifyBlogPost(spec.slug), spec.slug, spec.slug);
      assert.equal(slugs.has(spec.slug), false, spec.slug);
      assert.equal(taken.has(spec.slug), false, spec.slug);
      slugs.add(spec.slug);
      assert.equal(titles.has(spec.title), false, spec.title);
      assert.equal(takenTitles.has(spec.title), false, spec.title);
      titles.add(spec.title);
      assert.equal(isPartnerIntroPost(spec), false, spec.title);
      assert.equal(spec.tags.includes("AI Image"), true, spec.slug);
      const content = renderImageTipSpec(spec);
      const minimum = spec.locale === "en" ? 1200 : 700;
      assert.ok(content.length > minimum, `${spec.slug} content ${content.length}`);
      assert.ok(content.includes(`](${spec.landingPath})`), spec.slug);
      assert.ok(
        spec.excerpt.length >= 40 && spec.excerpt.length <= 180,
        `${spec.slug} excerpt ${spec.excerpt.length}: ${spec.excerpt}`,
      );
      const branded = postDocumentTitle(spec.title);
      assert.match(branded, /\| Scro$/, `${spec.slug} title became ${branded}`);
      assert.ok(spec.scene.length > 20, spec.slug);
      assert.equal(spec.points.length >= 3, true, spec.slug);
      if (spec.figure) {
        assert.equal(spec.figure.alt.includes("]"), false, spec.slug);
        assert.ok(content.includes(`![${spec.figure.alt}](`), spec.slug);
        assert.ok(spec.figure.scene.length > 20, spec.slug);
      }
    }
  });
});
