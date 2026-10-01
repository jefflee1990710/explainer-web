import assert from "node:assert/strict";
import { test } from "node:test";
import { briefEn } from "@/util/i18n/messages/workspace/brief.en";
import { briefZhHant } from "@/util/i18n/messages/workspace/brief.zh-Hant";

const FIELDS = ["voice", "structure", "picture", "frames"] as const;

test("every video type has a name and guide in English and Traditional Chinese", () => {
  const slugs = Object.keys(briefEn.videoTypes);
  assert.deepEqual(Object.keys(briefZhHant.videoTypes).sort(), [...slugs].sort());
  for (const slug of slugs) {
    const enName = briefEn.videoTypes[slug as keyof typeof briefEn.videoTypes];
    const zhName = briefZhHant.videoTypes[slug as keyof typeof briefZhHant.videoTypes];
    assert.ok(enName.length > 0, slug);
    assert.ok(zhName.length > 0, slug);
    assert.notEqual(enName, zhName, slug);
    const enGuide = briefEn.skillGuide.types[slug as keyof typeof briefEn.skillGuide.types];
    const zhGuide = briefZhHant.skillGuide.types[slug as keyof typeof briefZhHant.skillGuide.types];
    for (const field of FIELDS) {
      assert.ok(enGuide[field].length > 0, `en ${slug} ${field}`);
      assert.ok(zhGuide[field].length > 0, `zh ${slug} ${field}`);
    }
  }
});
