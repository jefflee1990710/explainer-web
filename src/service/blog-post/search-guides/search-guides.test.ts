import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isPartnerIntroPost } from "@/service/blog-post/indexable";
import { SEARCH_GUIDES, translationMap } from "@/service/blog-post/search-guides";
import { slugifyBlogPost } from "@/service/blog-post/slug";
import { postDocumentTitle } from "@/util/seo/public-metadata";

describe("search guides", () => {
  it("publishes 18 guides in 6 groups and 3 locales", () => {
    assert.equal(SEARCH_GUIDES.length, 18);
    const groups = new Set(SEARCH_GUIDES.map((guide) => guide.group));
    assert.equal(groups.size, 6);
    for (const group of groups) {
      const locales = SEARCH_GUIDES.filter((guide) => guide.group === group)
        .map((guide) => guide.locale)
        .sort();
      assert.deepEqual(locales, ["en", "zh-Hans", "zh-Hant"]);
    }
  });

  it("keeps slugs, titles, links, and translations indexable", () => {
    const slugs = new Set<string>();
    for (const guide of SEARCH_GUIDES) {
      assert.equal(slugifyBlogPost(guide.slug), guide.slug, guide.slug);
      assert.equal(slugs.has(guide.slug), false);
      slugs.add(guide.slug);
      assert.equal(isPartnerIntroPost(guide), false, guide.title);
      assert.equal(/^Introducing\s/i.test(guide.title), false);
      // Chinese is denser per character, so the floor is lower than the English guides.
      const minimum = guide.locale === "en" ? 1600 : 1000;
      assert.ok(
        guide.content.length > minimum,
        `${guide.slug} content ${guide.content.length}`,
      );
      assert.ok(
        guide.content.includes(`](${guide.landingPath})`),
        `${guide.slug} missing ${guide.landingPath}`,
      );
      assert.ok(guide.content.includes("](/examples") || guide.content.includes("](/examples)"), guide.slug);
      assert.ok(
        guide.excerpt.length >= 40 && guide.excerpt.length <= 180,
        `${guide.slug} excerpt ${guide.excerpt.length}`,
      );
      const branded = postDocumentTitle(guide.title);
      assert.match(branded, /\| Scro$/, `${guide.slug} title became ${branded}`);
      assert.ok(guide.featureImage.startsWith("https://"), guide.slug);
      const map = translationMap(guide);
      assert.equal(map[guide.locale], undefined);
      assert.equal(Object.keys(map).length, 2);
      for (const [locale, slug] of Object.entries(map)) {
        assert.notEqual(slug, guide.slug);
        const sibling = SEARCH_GUIDES.find((item) => item.slug === slug);
        assert.ok(sibling, slug);
        assert.equal(sibling.group, guide.group);
        assert.equal(sibling.locale, locale);
        assert.equal(translationMap(sibling)[guide.locale], guide.slug);
      }
    }
  });
});
