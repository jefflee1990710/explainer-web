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
];

for (const dir of DIRS) {
  test(`${dir} has a valid bilingual profile.json`, () => {
    const file = path.join(process.cwd(), "skills", dir, "profile.json");
    const profile = parseSystemProfile(JSON.parse(readFileSync(file, "utf8")));
    assert.ok(profile.en.bestFor && profile["zh-Hant"].bestFor);
  });
}
