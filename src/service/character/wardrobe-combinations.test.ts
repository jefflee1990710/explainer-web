import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { isCharacterLookId } from "@/service/character/character-look";
import {
  CASUAL_ACCESSORIES,
  CASUAL_HAIR,
  CASUAL_LABELS_EN,
  CASUAL_LABELS_ZH,
  CASUAL_PANTS,
  CASUAL_SHOES,
  CASUAL_TOPS,
} from "@/service/character/casual-wardrobe";
import {
  getWardrobeCombinationById,
  listWardrobeCombinations,
  recommendCombinationsForWardrobePicks,
  wardrobeCombinationToPicks,
} from "@/service/character/wardrobe-combinations";
import { LIFE_POSES } from "@/model/life-poses.data";
import { LIFE_POST_TEMPLATES, lifePostTemplateById } from "@/model/life-post-template";
import { WardrobeCombinationSchema } from "@/model/wardrobe-combination";
import { WARDROBE_COMBINATIONS } from "@/model/wardrobe-combinations.data";
import { LIFE_POSE_NAMES_EN, LIFE_POSE_NAMES_ZH } from "@/util/i18n/messages/life-poses.names";
import { LIFE_TEMPLATES_EN, LIFE_TEMPLATES_ZH } from "@/util/i18n/messages/life-templates";

const NEW_LIFESTYLE_ACCOUNTS = [
  "yeyedamei",
  "_tnnn26",
  "formunawei",
  "wtingv_",
  "j876my",
  "chloeceyi_",
  "natalieyuung",
  "maggielee2xys",
  "pparadeee",
  "tammyy.tm",
] as const;

describe("wardrobe combinations & distilled lifestyle IG catalog", () => {
  it("validates every combination in WARDROBE_COMBINATIONS against WardrobeCombinationSchema and catalog IDs", () => {
    assert.ok(WARDROBE_COMBINATIONS.length >= 60);
    const seenIds = new Set<string>();
    const poseIds = new Set(LIFE_POSES.map((p) => p.id));

    for (const combo of WARDROBE_COMBINATIONS) {
      const parsed = WardrobeCombinationSchema.safeParse(combo);
      assert.ok(parsed.success, `Invalid combination schema for ${combo.id}`);
      assert.ok(!seenIds.has(combo.id), `Duplicate combination id: ${combo.id}`);
      seenIds.add(combo.id);

      assert.ok(
        isCharacterLookId("top", combo.items.top),
        `Combo ${combo.id} references unknown top: ${combo.items.top}`,
      );
      assert.ok(
        isCharacterLookId("pants", combo.items.pants),
        `Combo ${combo.id} references unknown pants: ${combo.items.pants}`,
      );
      assert.ok(
        isCharacterLookId("shoes", combo.items.shoes),
        `Combo ${combo.id} references unknown shoes: ${combo.items.shoes}`,
      );
      assert.ok(
        isCharacterLookId("accessory", combo.items.accessory),
        `Combo ${combo.id} references unknown accessory: ${combo.items.accessory}`,
      );
      if (combo.items.hair) {
        assert.ok(
          isCharacterLookId("hair", combo.items.hair),
          `Combo ${combo.id} references unknown hair: ${combo.items.hair}`,
        );
      }
      if (combo.recommendedTemplateId) {
        assert.ok(
          lifePostTemplateById(combo.recommendedTemplateId),
          `Combo ${combo.id} references unknown template: ${combo.recommendedTemplateId}`,
        );
      }
      if (combo.recommendedPoseId) {
        assert.ok(
          poseIds.has(combo.recommendedPoseId),
          `Combo ${combo.id} references unknown pose: ${combo.recommendedPoseId}`,
        );
      }
    }
  });

  it("includes recommended combinations for all 10 newly distilled lifestyle IG accounts", () => {
    for (const account of NEW_LIFESTYLE_ACCOUNTS) {
      const hits = listWardrobeCombinations({ account });
      assert.ok(
        hits.length >= 1,
        `Expected at least 1 recommended combination for @${account}, got ${hits.length}`,
      );
    }
  });

  it("filters and recommends combinations by tag, itemId, query, and current wardrobe picks", () => {
    const boleroCombos = listWardrobeCombinations({ itemId: "cscasualboleroshrug" });
    assert.ok(boleroCombos.length >= 1);

    const pickleballCombos = listWardrobeCombinations({ tag: "pickleball" });
    assert.ok(pickleballCombos.length >= 2);

    const queryHits = listWardrobeCombinations({ query: "matcha" });
    assert.ok(queryHits.some((c) => c.id === "combo-tammyytm-tatami-matcha-ribbon"));

    const byId = getWardrobeCombinationById("combo-tnnn26-bolero-tierskirt");
    assert.ok(byId);
    const picks = wardrobeCombinationToPicks(byId);
    assert.equal(picks.top, "cscasualboleroshrug");
    assert.equal(picks.pants, "cscasualtierlaceskirt");
    assert.equal(picks.shoes, "cscasualredretro");
    assert.equal(picks.accessory, "cscasualpuffybag");

    const recommended = recommendCombinationsForWardrobePicks(
      { top: "cscasualboleroshrug", pants: "cscasualtierlaceskirt" },
      3,
    );
    assert.equal(recommended.length, 3);
    assert.equal(recommended[0].id, "combo-tnnn26-bolero-tierskirt");
  });

  it("has complete bilingual labels for all casual wardrobe items, templates, and poses", () => {
    for (const h of CASUAL_HAIR) {
      assert.ok(CASUAL_LABELS_EN.hair[h.id as keyof typeof CASUAL_LABELS_EN.hair], `Missing EN hair label: ${h.id}`);
      assert.ok(CASUAL_LABELS_ZH.hair[h.id as keyof typeof CASUAL_LABELS_ZH.hair], `Missing ZH hair label: ${h.id}`);
    }
    for (const t of CASUAL_TOPS) {
      assert.ok(CASUAL_LABELS_EN.top[t.id as keyof typeof CASUAL_LABELS_EN.top], `Missing EN top label: ${t.id}`);
      assert.ok(CASUAL_LABELS_ZH.top[t.id as keyof typeof CASUAL_LABELS_ZH.top], `Missing ZH top label: ${t.id}`);
    }
    for (const p of CASUAL_PANTS) {
      assert.ok(CASUAL_LABELS_EN.pants[p.id as keyof typeof CASUAL_LABELS_EN.pants], `Missing EN pants label: ${p.id}`);
      assert.ok(CASUAL_LABELS_ZH.pants[p.id as keyof typeof CASUAL_LABELS_ZH.pants], `Missing ZH pants label: ${p.id}`);
    }
    for (const s of CASUAL_SHOES) {
      assert.ok(CASUAL_LABELS_EN.shoes[s.id as keyof typeof CASUAL_LABELS_EN.shoes], `Missing EN shoes label: ${s.id}`);
      assert.ok(CASUAL_LABELS_ZH.shoes[s.id as keyof typeof CASUAL_LABELS_ZH.shoes], `Missing ZH shoes label: ${s.id}`);
    }
    for (const a of CASUAL_ACCESSORIES) {
      assert.ok(
        CASUAL_LABELS_EN.accessory[a.id as keyof typeof CASUAL_LABELS_EN.accessory],
        `Missing EN accessory label: ${a.id}`,
      );
      assert.ok(
        CASUAL_LABELS_ZH.accessory[a.id as keyof typeof CASUAL_LABELS_ZH.accessory],
        `Missing ZH accessory label: ${a.id}`,
      );
    }

    for (const tpl of LIFE_POST_TEMPLATES) {
      assert.ok(LIFE_TEMPLATES_EN.names[tpl.id], `Missing EN template name: ${tpl.id}`);
      assert.ok(LIFE_TEMPLATES_ZH.names[tpl.id], `Missing ZH template name: ${tpl.id}`);
      assert.ok(LIFE_TEMPLATES_EN.tips[tpl.id], `Missing EN template tip: ${tpl.id}`);
      assert.ok(LIFE_TEMPLATES_ZH.tips[tpl.id], `Missing ZH template tip: ${tpl.id}`);
    }

    for (const poseId of [
      "casual-tatami-matcha-kneel",
      "sport-archery-draw",
      "casual-inflight-curl",
      "casual-table-ankle-cross",
    ]) {
      assert.ok(LIFE_POSE_NAMES_EN[poseId], `Missing EN pose name: ${poseId}`);
      assert.ok(LIFE_POSE_NAMES_ZH[poseId], `Missing ZH pose name: ${poseId}`);
      const pngPath = path.join(process.cwd(), "public", "life-poses", `${poseId}.png`);
      assert.ok(fs.existsSync(pngPath), `Missing rendered pose PNG: ${pngPath}`);
    }
  });
});
