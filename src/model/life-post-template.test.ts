import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import {
  LIFE_POST_CATEGORIES,
  LIFE_POST_TEMPLATES,
  QUICK_LIFE_TEMPLATE_ID,
  lifePostTemplateById,
  lifePostTemplatePreviewSrc,
  lifePostTemplatesInCategory,
  pickRandomLifePostTemplateId,
} from "@/model/life-post-template";
import { LIFE_SHOT_KINDS } from "@/model/life-shot-kind";
import { LIFE_TEMPLATES_EN, LIFE_TEMPLATES_ZH } from "@/util/i18n/messages/life-templates";

test("life post template ids are unique and every category has templates", () => {
  const ids = LIFE_POST_TEMPLATES.map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(ids.length, 57);
  for (const category of LIFE_POST_CATEGORIES) {
    assert.ok(lifePostTemplatesInCategory(category).length >= 3, category);
  }
});

test("every template has a valid kind, prompt guide, and Scro preview webp", () => {
  for (const t of LIFE_POST_TEMPLATES) {
    assert.ok((LIFE_SHOT_KINDS as readonly string[]).includes(t.kind), t.id);
    assert.ok(t.promptGuide.length > 40, t.id);
    const previewFile = lifePostTemplatePreviewSrc(t.id).split("?")[0];
    assert.ok(existsSync(path.join(process.cwd(), "public", previewFile)), `preview ${t.id}`);
  }
});

test("EN and zh-Hant have a name and tip for every template and category", () => {
  for (const labels of [LIFE_TEMPLATES_EN, LIFE_TEMPLATES_ZH]) {
    for (const category of LIFE_POST_CATEGORIES) assert.ok(labels.categories[category], category);
    for (const t of LIFE_POST_TEMPLATES) {
      assert.ok(labels.names[t.id], `name ${t.id}`);
      assert.ok(labels.tips[t.id], `tip ${t.id}`);
    }
    assert.equal(Object.keys(labels.names).length, LIFE_POST_TEMPLATES.length);
  }
});

test("lifePostTemplateById returns null for unknown ids", () => {
  assert.equal(lifePostTemplateById("nope"), null);
  assert.equal(lifePostTemplateById(undefined), null);
  assert.equal(lifePostTemplateById("street-look-back")?.categoryId, "street");
});

test("QUICK_LIFE_TEMPLATE_ID is street-ootd-full and exists in the catalog", () => {
  assert.equal(QUICK_LIFE_TEMPLATE_ID, "street-ootd-full");
  assert.ok(lifePostTemplateById(QUICK_LIFE_TEMPLATE_ID));
});

test("pickRandomLifePostTemplateId returns a catalog id using the provided RNG", () => {
  const id = pickRandomLifePostTemplateId(() => 0);
  assert.equal(id, LIFE_POST_TEMPLATES[0].id);
  const last = pickRandomLifePostTemplateId(() => 0.999999);
  assert.equal(last, LIFE_POST_TEMPLATES[LIFE_POST_TEMPLATES.length - 1].id);
});

test("pickRandomLifePostTemplateId only returns known template ids", () => {
  for (let i = 0; i < 40; i++) {
    const id = pickRandomLifePostTemplateId();
    assert.ok(lifePostTemplateById(id), `unknown id: ${id}`);
  }
});
