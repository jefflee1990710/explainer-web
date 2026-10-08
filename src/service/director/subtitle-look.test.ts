import assert from "node:assert/strict";
import test from "node:test";
import { resolveSubtitleLook, subtitleLookLine, textStyleSampleLookLine } from "@/service/director/subtitle-look";

test("subtitle look is appearance only and falls back when missing", () => {
  assert.equal(resolveSubtitleLook(undefined), "handwritten");
  assert.equal(resolveSubtitleLook("nope"), "handwritten");
  assert.equal(resolveSubtitleLook("bold"), "bold");
  const line = subtitleLookLine("clean");
  assert.match(line, /torn-paper strips/);
  assert.match(subtitleLookLine("bold"), /yellow dry-brush/);
  assert.match(subtitleLookLine("handwritten"), /thick black marker/);
  assert.doesNotMatch(line, /%|bottom|center|lower third|safe area/i);
  const sample = textStyleSampleLookLine(3);
  assert.match(sample, /attached image 3/);
  assert.doesNotMatch(sample, /%|bottom|center|lower third|safe area/i);
});
