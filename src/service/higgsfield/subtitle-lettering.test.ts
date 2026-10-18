import assert from "node:assert/strict";
import test from "node:test";
import { ObjectId } from "mongodb";
import {
  ensureSubtitleLetteringUrl,
  letteringLookFor,
  subtitleLetteringKey,
  subtitleLetteringPrompt,
  subtitleLetteringPromptLine,
} from "@/service/higgsfield/subtitle-lettering";

test("letteringLookFor uses the custom sample, else the system look", () => {
  assert.deepEqual(letteringLookFor({ subtitleLook: "clean" }), { kind: "system", look: "clean" });
  assert.deepEqual(
    letteringLookFor({ subtitleLook: "clean", textStyleImageUrl: "https://x/sample.png" }),
    { kind: "custom", sampleUrl: "https://x/sample.png" },
  );
});

test("subtitleLetteringKey changes with the words or the look, not with spacing", () => {
  const clean = { kind: "system", look: "clean" } as const;
  const bold = { kind: "system", look: "bold" } as const;
  const line = "What if you have zero budget for marketing?";
  assert.equal(subtitleLetteringKey(line, clean), subtitleLetteringKey(`  ${line.replace(/ /g, "  ")} `, clean));
  assert.notEqual(subtitleLetteringKey(line, clean), subtitleLetteringKey(line, bold));
  assert.notEqual(subtitleLetteringKey(line, clean), subtitleLetteringKey(`${line}!`, clean));
});

test("subtitleLetteringPrompt draws text only in the torn-paper look with the guide's line breaks", () => {
  const prompt = subtitleLetteringPrompt({
    line: "What if you have zero budget for marketing?",
    look: { kind: "system", look: "clean" },
    hasSample: true,
  });
  assert.match(prompt, /^Subtitle lettering card only\./);
  assert.match(prompt, /No person, no room/);
  assert.match(prompt, /torn-paper strips/);
  assert.match(prompt, /Attached image 2 is the lettering look sample/);
  assert.match(prompt, /Attached image 1 is a plain font-rendered spelling guide/);
  assert.match(prompt, /line 1 "What if you have", line 2 "zero budget for marketing\?"/);
});

test("subtitleLetteringPrompt skips the sample line when no sample is sent", () => {
  const prompt = subtitleLetteringPrompt({
    line: "Try it now",
    look: { kind: "system", look: "neon" },
    hasSample: false,
  });
  assert.doesNotMatch(prompt, /Attached image 2/);
  assert.match(prompt, /neon glass tubing/);
  assert.match(prompt, /one line: "Try it now"/);
});

test("subtitleLetteringPromptLine takes the look from the card and the spelling from the font guide", () => {
  const line = subtitleLetteringPromptLine(4, 5, "What if you have zero budget for marketing?");
  assert.match(line, /^SUBTITLE LETTERING: attached image 4 is the finished subtitle lettering look/);
  assert.match(line, /attached image 5 is the font-rendered spelling guide/);
  assert.match(line, /"What if you have" \/ "zero budget for marketing\?"/);
  assert.match(line, /attached image 5 wins/);
  assert.match(line, /do not draw a plain white caption/);
});

test("ensureSubtitleLetteringUrl renders a local sharp SVG PNG data URL without AI calls", async () => {
  const url = await ensureSubtitleLetteringUrl(
    { _id: new ObjectId(), subtitleLook: "clean" },
    "零預算做行銷，怎樣每天出片？",
  );
  assert.ok(url);
  assert.match(url, /^data:image\/png;base64,/);
});
