import assert from "node:assert/strict";
import { test } from "node:test";
import { emptyEdit, type VideoEdit } from "@/model/video-edit";
import { reelCoversJoins } from "@/service/video-edit/export-source";

test("a plain edit can start from the server reel", () => {
  assert.equal(reelCoversJoins(emptyEdit(), [1, 2, 3]), true);
  assert.equal(reelCoversJoins({ ...emptyEdit(), layers: [] }, [1]), true);
});

test("bookends or a fade between clips need a browser join", () => {
  const withIntro: VideoEdit = { ...emptyEdit(), intro: { kind: "image", assetUrl: "https://x/a.png", durationSec: 2 } };
  assert.equal(reelCoversJoins(withIntro, [1, 2]), false);
  const withFade: VideoEdit = { ...emptyEdit(), defaultTransition: { effect: "fade", durationSec: 0.5 } };
  assert.equal(reelCoversJoins(withFade, [1, 2]), false);
  assert.equal(reelCoversJoins(withFade, [1]), true);
});
