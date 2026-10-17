import assert from "node:assert/strict";
import { test } from "node:test";
import { withTalkingSubtitleHandoff } from "@/service/director/talking-subtitle-handoff";

const motion =
  '0–0.4s she stays in the exact framing of the first frame, mouth opening into this line, the large subtitle fades and slides up into place a little below the vertical center, no cut and no jump; 0.4–4.2s she speaks "Reels organic reach is insane right now," and the large subtitle holds still; 4.2–5s the mouth closes, both hands open, the large subtitle fades and slides down out; camera stays locked.\n\nSubtitle: keep this clip\'s spoken line a little below the vertical center for the whole clip. Same words, same place, from the first frame to the last.';

test("talking-head handoff swaps to the next line instead of fading the subtitle", () => {
  const out = withTalkingSubtitleHandoff(motion, {
    line: "Reels organic reach is insane right now,",
    nextLine: "but who has time to script and edit every day?",
    language: "en",
  });
  assert.doesNotMatch(out, /fades and slides up into place/);
  assert.doesNotMatch(out, /fades and slides down out/);
  assert.match(out, /already sits in place a little below the vertical center/);
  assert.match(out, /slides and fades into the next subtitle "but who has time to script and edit every day\?"/);
  assert.match(out, /words change to the next clip's line only in the last moment/);
  assert.match(out, /Never redraw it as a plain white caption/);
  assert.match(out, /never speaks the next subtitle/);
  // Re-sending the same prompt does not stack the lock twice.
  assert.equal(withTalkingSubtitleHandoff(out, { line: "x", nextLine: "y", language: "en" }), out);
});

test("last talking-head clip holds its own subtitle to the end", () => {
  const out = withTalkingSubtitleHandoff(motion, { line: "Reels organic reach is insane right now,", language: "en" });
  assert.doesNotMatch(out, /fades and slides down out/);
  assert.doesNotMatch(out, /next subtitle/);
  assert.match(out, /, and the large subtitle holds;/);
  assert.match(out, /Same words, same place, from the first frame to the last\./);
});

test("handoff leaves a no-writing prompt alone", () => {
  const prompt = "She speaks.\n\nNo letters, subtitles, captions, signs, or labels appear at any moment.";
  assert.equal(withTalkingSubtitleHandoff(prompt, { line: "a", nextLine: "b", language: "en" }), prompt);
});

test("Cantonese handoff paints the next line in written Chinese", () => {
  const out = withTalkingSubtitleHandoff(
    "0–0.4s 開口講呢句、大字幕由下向上淡入到中線下面少少嘅字幕；4.2–5s 口部合上，大字幕向下淡出；鏡頭鎖定。",
    { line: "佢哋喺度", nextLine: "下一句", language: "yue" },
  );
  assert.doesNotMatch(out, /淡入到|向下淡出/);
  assert.match(out, /大字幕已經喺中線下面少少嘅字幕/);
  assert.match(out, /滑動淡入下一段字幕「下一句」/);
  assert.match(out, /唔好改成普通白色字幕/);
});
