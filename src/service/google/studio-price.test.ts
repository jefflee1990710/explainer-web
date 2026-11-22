import assert from "node:assert/strict";
import { test } from "node:test";
import {
  GOOGLE_STUDIO_NANO_BANANA,
  GOOGLE_STUDIO_NANO_BANANA_2,
  GOOGLE_STUDIO_NANO_BANANA_2_LITE,
  GOOGLE_STUDIO_NANO_BANANA_PRO,
  GOOGLE_STUDIO_OMNI_11,
  GOOGLE_STUDIO_OMNI_12,
  googleStudioImageUserUsd,
  googleStudioVideoUserUsd,
} from "@/service/google/studio-price";

const beforeSwitch = new Date("2026-11-22T00:00:00.000Z");
const afterSwitch = new Date("2026-12-03T00:00:00.000Z");

test("Gemini image models use the published Google still price plus 50 percent", () => {
  assert.equal(googleStudioImageUserUsd("gemini-nano-banana-2.1"), 0.0504);
  assert.equal(googleStudioImageUserUsd("google:gemini-nano-banana-2.1", { resolution: "2k" }), 0.0756);
  assert.equal(googleStudioImageUserUsd("google/gemini-nano-banana-2.1", { resolution: "4k" }), 0.1701);

  assert.equal(googleStudioImageUserUsd(GOOGLE_STUDIO_NANO_BANANA_2), 0.1008);
  assert.equal(googleStudioImageUserUsd(GOOGLE_STUDIO_NANO_BANANA_2, { resolution: "2k" }), 0.1512);
  assert.equal(googleStudioImageUserUsd(GOOGLE_STUDIO_NANO_BANANA_2, { resolution: "4k" }), 0.2268);

  assert.equal(googleStudioImageUserUsd(GOOGLE_STUDIO_NANO_BANANA_2_LITE, { resolution: "4k" }), 0.0504);
  assert.equal(googleStudioImageUserUsd(GOOGLE_STUDIO_NANO_BANANA), 0.0585);

  assert.equal(googleStudioImageUserUsd(GOOGLE_STUDIO_NANO_BANANA_PRO), 0.201);
  assert.equal(googleStudioImageUserUsd(GOOGLE_STUDIO_NANO_BANANA_PRO, { resolution: "2k" }), 0.201);
  assert.equal(googleStudioImageUserUsd(GOOGLE_STUDIO_NANO_BANANA_PRO, { resolution: "4k" }), 0.36);
  // $0.0011 × 1.5 = $0.0017 per reference image.
  assert.equal(
    googleStudioImageUserUsd(GOOGLE_STUDIO_NANO_BANANA_PRO, { resolution: "2k", referenceImages: 2 }),
    0.2044,
  );
});

test("Gemini Omni bills 720p tokens per second plus 50 percent", () => {
  // 5792 tokens/s × $12 / 1M = $0.069504, × 1.5 = $0.1043/s. Default clip is 10s.
  assert.equal(googleStudioVideoUserUsd(GOOGLE_STUDIO_OMNI_12, { now: beforeSwitch }), 1.043);
  assert.equal(
    googleStudioVideoUserUsd(GOOGLE_STUDIO_OMNI_12, { durationSeconds: 15, now: beforeSwitch }),
    1.5645,
  );
  assert.equal(
    googleStudioVideoUserUsd(GOOGLE_STUDIO_OMNI_12, { durationSeconds: 2, now: beforeSwitch }),
    0.3129,
  );
  // Omni 1.1 stays on $17.50 / 1M until 2026-12-03, then matches Omni 1.2.
  assert.equal(googleStudioVideoUserUsd(GOOGLE_STUDIO_OMNI_11, { now: beforeSwitch }), 1.52);
  assert.equal(googleStudioVideoUserUsd(GOOGLE_STUDIO_OMNI_11, { now: afterSwitch }), 1.043);
});
