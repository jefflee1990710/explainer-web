import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyOpencutSubtitlePlates,
  opencutSubtitleStyleChanged,
} from "@/service/opencut/subtitle-plates";

test("classify reuses completed plates when style unchanged", () => {
  const result = classifyOpencutSubtitlePlates({
    clips: [{ clipNumber: 1, englishVo: "Hello" }],
    plates: [{ clipNumber: 1, status: "completed", blobUrl: "https://blob/a.png", line: "Hello" }],
    clipNumbers: [1],
    styleChanged: false,
  });
  assert.deepEqual(result.ready, [{ clipNumber: 1, url: "https://blob/a.png" }]);
  assert.deepEqual(result.toEnqueue, []);
});

test("classify re-enqueues when lettering style changed", () => {
  const result = classifyOpencutSubtitlePlates({
    clips: [{ clipNumber: 1, englishVo: "Hello" }],
    plates: [{ clipNumber: 1, status: "completed", blobUrl: "https://blob/a.png", line: "Hello" }],
    clipNumbers: [1],
    styleChanged: true,
  });
  assert.deepEqual(result.ready, []);
  assert.deepEqual(result.toEnqueue, [1]);
});

test("opencutSubtitleStyleChanged compares custom sample url", () => {
  assert.equal(
    opencutSubtitleStyleChanged(
      { textStyleId: "abc", textStyleImageUrl: "https://a" },
      { textStyleId: "abc", textStyleImageUrl: "https://b" },
    ),
    true,
  );
});
