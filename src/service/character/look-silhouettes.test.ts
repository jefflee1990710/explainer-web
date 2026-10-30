import assert from "node:assert/strict";
import test from "node:test";
import { isFullBodyTop, optionsForLookPart } from "@/service/character/character-look";
import {
  HAIR_SILHOUETTES,
  PANTS_SILHOUETTES,
  SHOE_SILHOUETTES,
  TOP_SILHOUETTES,
  filterOptionsBySilhouette,
  lookSilhouette,
  silhouettesForPart,
} from "@/service/character/look-silhouettes";
import { SILHOUETTE_DRESS_IDS, SILHOUETTE_LABELS_EN, SILHOUETTE_LABELS_ZH } from "@/service/character/silhouette-catalog";
import { en } from "@/util/i18n/messages/en";
import { zhHant } from "@/util/i18n/messages/zh-Hant";

test("each fine cut has at least 50 wardrobe options", () => {
  const groups = [
    ["hair", HAIR_SILHOUETTES],
    ["top", TOP_SILHOUETTES],
    ["pants", PANTS_SILHOUETTES],
    ["shoes", SHOE_SILHOUETTES],
  ] as const;
  for (const [part, kinds] of groups) {
    assert.deepEqual(silhouettesForPart(part), kinds);
    for (const kind of kinds) {
      const count = optionsForLookPart(part).filter((option) => lookSilhouette(part, option) === kind).length;
      assert.ok(count >= 50, `${part}/${kind} has ${count}`);
    }
  }
  assert.deepEqual(silhouettesForPart("accessory"), []);
  assert.deepEqual(silhouettesForPart("face"), []);
});

test("existing closet pieces land in the cut a person would search", () => {
  const pants = (id: string) => lookSilhouette("pants", optionsForLookPart("pants").find((option) => option.id === id)!);
  assert.equal(pants("jeans"), "jeans");
  assert.equal(pants("skinnyjeans"), "jeans");
  assert.equal(pants("momjeans"), "jeans");
  assert.equal(pants("tennisskirt"), "mini");
  assert.equal(pants("maxiskirt"), "maxi");
  assert.equal(pants("pencilskirt"), "midi");
  assert.equal(pants("denimskirt"), "midi");
  assert.equal(pants("cargoskirt"), "midi");
  assert.equal(pants("shorts"), "shorts");
  assert.equal(pants("cargo"), "cargo");
  assert.equal(pants("leggings"), "legging");
  assert.equal(pants("wide"), "wide");
  assert.equal(pants("chinos"), "trouser");
  assert.equal(lookSilhouette("hair", optionsForLookPart("hair").find((option) => option.id === "bob")!), "bob");
  assert.equal(lookSilhouette("top", optionsForLookPart("top").find((option) => option.id === "tee")!), "tee");
  assert.equal(lookSilhouette("shoes", optionsForLookPart("shoes").find((option) => option.id === "sneakers")!), "sneaker");
});

test("catalogue dresses clear the pants slot and every cut has both names", () => {
  assert.equal(SILHOUETTE_DRESS_IDS.length, 50);
  for (const id of SILHOUETTE_DRESS_IDS) {
    assert.equal(isFullBodyTop(id), true);
    assert.equal(lookSilhouette("top", optionsForLookPart("top").find((option) => option.id === id)!), "dress");
  }
  assert.equal(isFullBodyTop("tee"), false);

  for (const part of ["hair", "top", "pants", "shoes"] as const) {
    for (const option of optionsForLookPart(part)) {
      if (!option.id.startsWith("sg")) continue;
      assert.equal(en.characters.look.options[part][option.id], SILHOUETTE_LABELS_EN[part][option.id]);
      assert.equal(zhHant.characters.look.options[part][option.id], SILHOUETTE_LABELS_ZH[part][option.id]);
      assert.ok(en.characters.look.silhouettes[part][option.silhouette ?? ""]);
      assert.ok(zhHant.characters.look.silhouettes[part][option.silhouette ?? ""]);
    }
  }
});

test("silhouette filter keeps one cut and leaves all untouched", () => {
  const options = [
    { id: "a", silhouette: "jeans" },
    { id: "b", silhouette: "mini" },
    { id: "c", silhouette: null },
  ];
  assert.deepEqual(filterOptionsBySilhouette(options, "all").map((option) => option.id), ["a", "b", "c"]);
  assert.deepEqual(filterOptionsBySilhouette(options, "jeans").map((option) => option.id), ["a"]);
});
