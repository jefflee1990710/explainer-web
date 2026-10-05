import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { parseSystemProfile } from "@/service/director/profile";

const DIRS = [
  "cartoon-explainer-video-director",
  "story-short-director",
  "product-demo-director",
  "dialogue-qa-director",
  "listicle-director",
  "tutorial-director",
  "opening-director",
  "ending-director",
  "talking-head-director",
  "comparison-card-director",
  "talking-broll-director",
  "surprise-interview-director",
  "outfit-reel-director",
  "follow-shot-director",
];

for (const dir of DIRS) {
  test(`${dir} has a valid English profile.json`, () => {
    const file = path.join(process.cwd(), "skills", dir, "profile.json");
    const raw = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
    assert.equal("zh-Hant" in raw, false);
    const profile = parseSystemProfile(raw);
    assert.ok(profile.bestFor);
  });
}
