import assert from "node:assert/strict";
import test from "node:test";
import { videoApproved } from "@/service/mcp/video-approval";

test("video render starts only after the user accepts and checks approve", () => {
  assert.equal(videoApproved({ action: "accept", content: { approve: true } }), true);
  assert.equal(videoApproved({ action: "accept", content: { approve: false } }), false);
  assert.equal(videoApproved({ action: "accept", content: {} }), false);
  assert.equal(videoApproved({ action: "decline", content: { approve: true } }), false);
  assert.equal(videoApproved({ action: "cancel", content: { approve: true } }), false);
});
