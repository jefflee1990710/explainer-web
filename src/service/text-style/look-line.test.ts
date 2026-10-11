import assert from "node:assert/strict";
import test from "node:test";
import { ObjectId } from "mongodb";
import {
  DEFAULT_UPLOAD_LOOK_LINE,
  lookLineFromSystemLook,
  parseLookLine,
  resolveTextStyleLookLine,
} from "@/service/text-style/look-line";
import { buildTextStyleFromLook } from "@/service/text-style/actions";
import { customTextStylePreviewPrompt, subtitleLookLine } from "@/service/director/subtitle-look";
import { textStylePreviewHash, textStyleSamplePrompt } from "@/service/text-style/preview";

test("lookLineFromSystemLook matches subtitleLookLine", () => {
  assert.equal(lookLineFromSystemLook("neon"), subtitleLookLine("neon"));
});

test("resolveTextStyleLookLine falls back for upload-only docs", () => {
  assert.equal(resolveTextStyleLookLine({}), DEFAULT_UPLOAD_LOOK_LINE);
  assert.equal(resolveTextStyleLookLine({ lookLine: "  Look: brush  " }), "Look: brush");
});

test("parseLookLine rejects empty and overlong text", () => {
  assert.equal(parseLookLine("").ok, false);
  assert.equal(parseLookLine("Look: ok").ok, true);
  assert.equal(parseLookLine("x".repeat(2001)).ok, false);
});

test("buildTextStyleFromLook seeds lookLine chat and idle preview", () => {
  const now = new Date("2026-01-01T00:00:00.000Z");
  const doc = buildTextStyleFromLook({
    clerkUserId: "user_1",
    baseLookId: "neon",
    name: "My neon",
    imageUrl: "https://blob/neon.png",
    now,
  });
  assert.ok(doc._id instanceof ObjectId);
  assert.equal(doc.baseLookId, "neon");
  assert.equal(doc.lookLine, subtitleLookLine("neon"));
  assert.deepEqual(doc.chat, []);
  assert.equal(doc.previewStatus, "idle");
  assert.equal(doc.name, "My neon");
});

test("custom preview prompt keeps Try it now and the lookLine", () => {
  const prompt = customTextStylePreviewPrompt("Look: hot pink bubble letters.");
  assert.match(prompt, /Try it now/);
  assert.match(prompt, /hot pink bubble letters/);
  assert.match(prompt, /16:9/);
  assert.equal(textStyleSamplePrompt("Look: chalk"), customTextStylePreviewPrompt("Look: chalk"));
  assert.equal(
    textStylePreviewHash("Look: a"),
    textStylePreviewHash("Look: a"),
  );
  assert.notEqual(
    textStylePreviewHash("Look: a"),
    textStylePreviewHash("Look: b"),
  );
});
