import assert from "node:assert/strict";
import { test } from "node:test";
import { CATALOG_EXTRA_STYLES } from "@/service/style/catalog-styles";
import { isStyleId } from "@/model/style-id";

test("extra catalog styles are allowed ids with a full prompt", () => {
  const ids = CATALOG_EXTRA_STYLES.map((style) => style.id);
  assert.deepEqual(ids, ["low-poly", "colored-pencil", "dark-tech"]);
  for (const style of CATALOG_EXTRA_STYLES) {
    assert.equal(isStyleId(style.id), true);
    assert.match(style.fields.look, /\S/);
    assert.match(style.fields.palette, /\S/);
    assert.match(style.fields.negatives, /\S/);
  }
  assert.match(CATALOG_EXTRA_STYLES[0].fields.look, /low-poly/i);
  assert.match(CATALOG_EXTRA_STYLES[1].fields.look, /pencil/i);
  assert.match(CATALOG_EXTRA_STYLES[2].fields.look, /technical 3D/i);
  assert.doesNotMatch(CATALOG_EXTRA_STYLES[2].fields.look, /game world/i);
});
