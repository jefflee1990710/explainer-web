import assert from "node:assert/strict";
import { test } from "node:test";
import { renderableFromSystem } from "@/service/style/renderable-style";
import { testStyle } from "@/service/style/test-styles";
import { stylePreviewPrompt, stylePreviewInFlight } from "@/service/style/user-style-preview";

test("stylePreviewPrompt uses the saved look and the shared IDEA scene", () => {
  const prompt = stylePreviewPrompt(renderableFromSystem(testStyle("paper-cutout", {
    look: "torn kraft",
    letteringLine1: "Line 1 is torn paper.",
  })));
  assert.match(prompt, /torn kraft/);
  assert.match(prompt, /Line 1 is torn paper/);
  assert.match(prompt, /IDEA/);
  assert.match(prompt, /16:9/);
});

test("stylePreviewInFlight is true only for a generating preview younger than 15 minutes", () => {
  const now = new Date("2026-10-03T01:00:00Z");
  const base = { previewStatus: "generating" as const, previewStartedAt: new Date("2026-10-03T00:50:00Z") };
  assert.equal(stylePreviewInFlight(base, now), true);
  assert.equal(stylePreviewInFlight({ ...base, previewStartedAt: new Date("2026-10-03T00:40:00Z") }, now), false);
  assert.equal(stylePreviewInFlight({ previewStatus: "idle" }, now), false);
});
