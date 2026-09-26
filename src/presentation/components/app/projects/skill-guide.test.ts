import assert from "node:assert/strict";
import { test } from "node:test";
import { SKILL_GUIDE_FIELDS, skillGuideFor } from "@/presentation/components/app/projects/[id]/skill-guide";

const SEEDED = [
  "cartoon-explainer-video-director",
  "story-short-director",
  "product-demo-director",
  "dialogue-qa-director",
  "listicle-director",
  "tutorial-director",
];

test("every seeded director has 聲音 結構 畫面 畫格 copy", () => {
  for (const slug of SEEDED) {
    const guide = skillGuideFor(slug);
    assert.ok(guide, slug);
    for (const field of SKILL_GUIDE_FIELDS) {
      assert.ok(guide![field.key].length > 0, `${slug} ${field.label}`);
    }
  }
  assert.equal(skillGuideFor("unknown"), undefined);
});
