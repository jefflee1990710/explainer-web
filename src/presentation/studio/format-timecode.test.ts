import assert from "node:assert/strict";
import { test } from "node:test";
import { formatTimecode } from "@/presentation/studio/format-timecode";

test("formatTimecode writes HH:MM:SS:FF with a zero frame field", () => {
  assert.equal(formatTimecode(0), "00:00:00:00");
  assert.equal(formatTimecode(6), "00:00:06:00");
  assert.equal(formatTimecode(90), "00:01:30:00");
  assert.equal(formatTimecode(3661), "01:01:01:00");
  assert.equal(formatTimecode(-4), "00:00:00:00");
});
