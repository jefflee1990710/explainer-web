import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { KEYWORD_SPECS, renderKeywordSpec } from "@/service/blog-post/keyword-guides";
import { isPartnerIntroPost } from "@/service/blog-post/indexable";
import { SEARCH_GUIDES } from "@/service/blog-post/search-guides";
import { slugifyBlogPost } from "@/service/blog-post/slug";
import { postDocumentTitle } from "@/util/seo/public-metadata";

describe("keyword guides", () => {
  it("publishes 100 unique long-tail guides", () => {
    assert.equal(KEYWORD_SPECS.length, 100);
    const ids = KEYWORD_SPECS.map((spec) => spec.id);
    assert.deepEqual(ids, Array.from({ length: 100 }, (_, index) => index + 1));
    const slugs = new Set<string>();
    const titles = new Set<string>();
    const taken = new Set(SEARCH_GUIDES.map((guide) => guide.slug));
    for (const spec of KEYWORD_SPECS) {
      assert.equal(slugifyBlogPost(spec.slug), spec.slug, spec.slug);
      assert.equal(slugs.has(spec.slug), false, spec.slug);
      assert.equal(taken.has(spec.slug), false, spec.slug);
      slugs.add(spec.slug);
      assert.equal(titles.has(spec.title), false, spec.title);
      titles.add(spec.title);
      assert.equal(isPartnerIntroPost(spec), false, spec.title);
      assert.equal(/^Introducing\s/i.test(spec.title), false);
      const content = renderKeywordSpec(spec);
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
    }
  });
});
