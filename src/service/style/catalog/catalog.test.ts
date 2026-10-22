import assert from "node:assert/strict";
import test from "node:test";
import { STYLE_IDS } from "@/model/style-id";
import { STYLES, STYLES_BY_ID, getStyleById, resolveCatalogStyle } from "@/service/style/catalog";

test("all 35 STYLE_IDS exist in hardcoded catalog and satisfy IStyle", () => {
  assert.equal(STYLES.length, STYLE_IDS.length);
  for (const id of STYLE_IDS) {
    const style = STYLES_BY_ID[id];
    assert.ok(style, `missing style ${id}`);
    assert.equal(style.id, id);
    assert.ok(style.name.trim().length > 0, `${id} name`);
    assert.ok(style.description.trim().length > 0, `${id} description`);
    assert.ok(style.canvas.trim().length > 0, `${id} canvas`);
    assert.match(style.canvasColor, /^#[0-9a-fA-F]{6}$/, `${id} canvasColor`);
    assert.ok(style.look.trim().length > 0, `${id} look`);
    assert.ok(style.palette.trim().length > 0, `${id} palette`);
    assert.ok(style.typography.trim().length > 0, `${id} typography`);
    assert.ok(style.motion.trim().length > 0, `${id} motion`);
    assert.ok(style.negatives.trim().length > 0, `${id} negatives`);
    assert.equal(style.behavior.realistic, id === "realistic");
    assert.equal(
      style.behavior.usesDrawingSurface,
      id === "chalkboard" || id === "chalkboard-color",
    );
    assert.equal(style.behavior.monochromeChalk, id === "chalkboard");
    assert.equal(getStyleById(id), style);
  }
});

test("resolveCatalogStyle falls back unknown or legacy custom IDs to doodle", () => {
  assert.equal(resolveCatalogStyle("realistic").id, "realistic");
  assert.equal(resolveCatalogStyle("66f000000000000000000099").id, "doodle");
  assert.equal(resolveCatalogStyle(undefined).id, "doodle");
});
