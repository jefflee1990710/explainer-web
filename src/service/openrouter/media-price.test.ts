import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  HAILUO_3_VIDEO_MODEL,
  HEYGEN_AVATAR_IV_VIDEO_MODEL,
  NANO_BANANA_2_1_IMAGE_MODEL,
  OPENROUTER_PRICE_MARKUP,
  SEEDREAM_5_PRO_IMAGE_MODEL,
  markedUpOpenRouterUsd,
  openRouterImageUserUsd,
  openRouterVideoUserPerSecondUsd,
  openRouterVideoUserUsd,
} from "@/service/openrouter/media-price";

describe("OpenRouter media price markup", () => {
  it("marks every provider dollar up by 50 percent", () => {
    assert.equal(OPENROUTER_PRICE_MARKUP, 1.5);
    assert.equal(markedUpOpenRouterUsd(0.09), 0.135);
    assert.equal(markedUpOpenRouterUsd(0.13), 0.195);
    assert.equal(markedUpOpenRouterUsd(0.05), 0.075);
  });

  it("prices Seedream 5.0 Pro at the 2K high-resolution SKU and bills each reference image", () => {
    assert.equal(openRouterImageUserUsd(SEEDREAM_5_PRO_IMAGE_MODEL, { resolution: "1k" }), 0.0675);
    assert.equal(openRouterImageUserUsd(SEEDREAM_5_PRO_IMAGE_MODEL, { resolution: "2k" }), 0.135);
    assert.equal(
      openRouterImageUserUsd(SEEDREAM_5_PRO_IMAGE_MODEL, { resolution: "2k", referenceImages: 1 }),
      0.1395,
    );
    assert.equal(openRouterImageUserUsd("bytedance-seed/seedream-5-0-lite"), 0.0525);
  });

  it("prices Nano Banana 2.1 from the published output-token counts", () => {
    assert.equal(openRouterImageUserUsd(NANO_BANANA_2_1_IMAGE_MODEL, { resolution: "1k" }), 0.0504);
    assert.equal(openRouterImageUserUsd("gemini-nano-banana-2.1", { resolution: "2k" }), 0.0756);
    assert.equal(openRouterImageUserUsd(NANO_BANANA_2_1_IMAGE_MODEL, { resolution: "4k" }), 0.1701);
  });

  it("prices Hailuo 3, HeyGen Avatar IV, and Wan 3.0 from their per-second SKUs", () => {
    assert.equal(openRouterVideoUserPerSecondUsd(HAILUO_3_VIDEO_MODEL, "2K"), 0.195);
    assert.equal(openRouterVideoUserUsd(HAILUO_3_VIDEO_MODEL, { durationSeconds: 5 }), 0.975);
    assert.equal(
      openRouterVideoUserUsd(HAILUO_3_VIDEO_MODEL, { durationSeconds: 5, referenceImages: 1 }),
      1.035,
    );
    assert.equal(openRouterVideoUserPerSecondUsd(HEYGEN_AVATAR_IV_VIDEO_MODEL), 0.075);
    assert.equal(openRouterVideoUserUsd(HEYGEN_AVATAR_IV_VIDEO_MODEL, { durationSeconds: 10 }), 0.75);
    assert.equal(openRouterVideoUserPerSecondUsd("alibaba/wan-3.0"), 0.075);
  });

  it("turns Seedance 2.0 video tokens at 720p into a per-second price", () => {
    // 1280×720×24/1024 = 21600 tokens/s × $0.000007 = $0.1512, then × 1.5.
    assert.equal(openRouterVideoUserPerSecondUsd("bytedance/seedance-2.0", "720p"), 0.2268);
    assert.equal(
      openRouterVideoUserUsd("bytedance/seedance-2.0", { durationSeconds: 15, resolution: "720p" }),
      3.402,
    );
  });
});
