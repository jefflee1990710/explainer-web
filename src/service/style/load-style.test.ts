import assert from "node:assert/strict";
import { test } from "node:test";
import type { StyleDoc } from "@/model/style-doc";
import { STYLES } from "@/service/style/catalog";
import {
  catalogStyleFields,
  replaceStyleOverlay,
  resetStyleOverlay,
  resolvedStyle,
  styleFromDoc,
} from "@/service/style/load-style";

test("catalogStyleFields copies prompt fields only", () => {
  const fields = catalogStyleFields(STYLES.doodle);
  assert.equal(fields.name, STYLES.doodle.name);
  assert.equal(fields.look, STYLES.doodle.look);
  assert.equal("id" in fields, false);
  assert.equal("previewUrl" in fields, false);
});

test("styleFromDoc rejects incomplete docs", () => {
  assert.equal(styleFromDoc(null), null);
  assert.equal(styleFromDoc({ _id: "doodle", updatedAt: new Date() }), null);
  assert.equal(
    styleFromDoc({ _id: "doodle", ...catalogStyleFields(STYLES.doodle), look: "", updatedAt: new Date() }),
    null,
  );
});

test("styleFromDoc returns a Style when every prompt field is filled", () => {
  const doc: StyleDoc = { _id: "pixel", ...catalogStyleFields(STYLES.pixel), previewUrl: "https://x", updatedAt: new Date() };
  const style = styleFromDoc(doc);
  assert.ok(style);
  assert.equal(style.id, "pixel");
  assert.equal(style.look, STYLES.pixel.look);
  assert.equal("previewUrl" in style, false);
});

test("resolvedStyle uses the overlay after hydrate, catalog otherwise", () => {
  resetStyleOverlay();
  assert.equal(resolvedStyle("pixel").look, STYLES.pixel.look);
  replaceStyleOverlay([{ ...STYLES.pixel, look: "overridden look" }]);
  assert.equal(resolvedStyle("pixel").look, "overridden look");
  assert.equal(resolvedStyle("doodle").look, STYLES.doodle.look);
  resetStyleOverlay();
  assert.equal(resolvedStyle(undefined).id, "doodle");
});
