import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isPartnerIntroPost } from "@/service/blog-post/indexable";
import { slugifyBlogPost } from "@/service/blog-post/slug";
import {
  renderVisualPlaybookSpec,
  VISUAL_PLAYBOOK_SPECS,
} from "@/service/blog-post/visual-playbooks";
import { postDocumentTitle } from "@/util/seo/public-metadata";

describe("visual playbooks", () => {
  it("publishes 40 unique 5-example visual showcase and explainer use-case articles", () => {
    assert.equal(VISUAL_PLAYBOOK_SPECS.length, 40);
    const ids = VISUAL_PLAYBOOK_SPECS.map((spec) => spec.id);
    assert.deepEqual(ids, Array.from({ length: 40 }, (_, index) => index + 1));

    const slugs = new Set<string>();
    const titles = new Set<string>();

    for (const spec of VISUAL_PLAYBOOK_SPECS) {
      assert.equal(slugifyBlogPost(spec.slug), spec.slug, spec.slug);
      assert.equal(slugs.has(spec.slug), false, spec.slug);
      slugs.add(spec.slug);
      assert.equal(titles.has(spec.title), false, spec.title);
      titles.add(spec.title);
      assert.equal(isPartnerIntroPost(spec), false, spec.title);
      assert.equal(spec.examples.length, 5, `${spec.slug} must have 5 examples`);

      const mockUrls: Record<string, string> = {};
      for (const ex of spec.examples) {
        mockUrls[`${spec.slug}::${ex.key}`] = `https://blob.example/${spec.slug}-${ex.key}.webp`;
        assert.ok(ex.scene.length > 30, `${spec.slug} ${ex.key} scene`);
        assert.ok(ex.alt.length > 15, `${spec.slug} ${ex.key} alt`);
      }

      const content = renderVisualPlaybookSpec(spec, mockUrls);
      const minimum = spec.locale === "en" ? 2800 : 1600;
      assert.ok(content.length > minimum, `${spec.slug} content length ${content.length}`);
      assert.ok(content.includes(`](${spec.landingPath})`), spec.slug);
      for (const ex of spec.examples) {
        assert.ok(
          content.includes(mockUrls[`${spec.slug}::${ex.key}`]),
          `${spec.slug} missing inline image ${ex.key}`,
        );
      }
      assert.ok(
        spec.excerpt.length >= 30 && spec.excerpt.length <= 180,
        `${spec.slug} excerpt ${spec.excerpt.length}: ${spec.excerpt}`,
      );
      const branded = postDocumentTitle(spec.title);
      assert.match(branded, /\| Scro$/, `${spec.slug} title became ${branded}`);
      assert.equal(/opencut/i.test(content), false, `${spec.slug} should not mention OpenCut`);
    }
  });
});
