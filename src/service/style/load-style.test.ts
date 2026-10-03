import assert from "node:assert/strict";
import { test } from "node:test";
import type { StyleDoc } from "@/model/style-doc";
import type { Style } from "@/service/style/types";
import {
  replaceStyleOverlay,
  resetStyleOverlay,
  resolvedStyle,
  styleFromDoc,
  stylePromptFields,
} from "@/service/style/load-style";

function sampleStyle(id: Style["id"], overrides: Partial<Style> = {}): Style {
  return {
    id,
    name: `${id} name`,
    description: "desc",
    canvas: "canvas",
    canvasColor: "#ffffff",
    look: "look",
    palette: "palette",
    typography: "typography",
    motion: "motion",
    negatives: "negatives",
    ...overrides,
  };
}

test("stylePromptFields copies prompt fields only", () => {
  const style = sampleStyle("doodle", { look: "marker look" });
  const fields = stylePromptFields(style);
  assert.equal(fields.name, style.name);
  assert.equal(fields.look, "marker look");
  assert.equal("id" in fields, false);
  assert.equal("nameZh" in fields, false);
  assert.equal("previewUrl" in fields, false);
});

test("styleFromDoc rejects incomplete docs", () => {
  assert.equal(styleFromDoc(null), null);
  assert.equal(styleFromDoc({ _id: "doodle", updatedAt: new Date() }), null);
  assert.equal(
    styleFromDoc({
      _id: "doodle",
      ...stylePromptFields(sampleStyle("doodle")),
      look: "",
      updatedAt: new Date(),
    }),
    null,
  );
});

test("styleFromDoc returns a Style when every prompt field is filled", () => {
  const doc: StyleDoc = {
    _id: "pixel",
    ...stylePromptFields(sampleStyle("pixel", { look: "16-bit pixels" })),
    previewUrl: "https://x",
    updatedAt: new Date(),
  };
  const style = styleFromDoc(doc);
  assert.ok(style);
  assert.equal(style.id, "pixel");
  assert.equal(style.look, "16-bit pixels");
  assert.equal("previewUrl" in style, false);
  assert.equal(style.letteringLayout, undefined);
});

test("styleFromDoc copies optional lettering fields when present", () => {
  const style = styleFromDoc({
    _id: "paper-cutout",
    ...stylePromptFields(sampleStyle("paper-cutout")),
    letteringLine1: "torn dark-ink paper",
    letteringLayout: "  cut-paper VO at 40%  ",
    updatedAt: new Date(),
  });
  assert.ok(style);
  assert.equal(style.letteringLine1, "torn dark-ink paper");
  assert.equal(style.letteringLayout, "cut-paper VO at 40%");
  assert.equal(style.letteringLine2, undefined);
});

test("resolvedStyle throws when Mongo overlay is missing", () => {
  resetStyleOverlay();
  assert.throws(() => resolvedStyle("pixel"), /pixel.*Mongo/i);
  assert.throws(() => resolvedStyle(undefined), /doodle.*Mongo/i);
});

test("resolvedStyle uses the overlay after hydrate", () => {
  replaceStyleOverlay([sampleStyle("pixel", { look: "overridden look" })]);
  assert.equal(resolvedStyle("pixel").look, "overridden look");
  resetStyleOverlay();
});
