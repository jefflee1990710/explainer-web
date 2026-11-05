import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyClipStyleToStoryboardClips,
  canChangeClipStyle,
  resolveClipInspectorKind,
} from "@/service/opencut/clip-inspector-kind";
import {
  SCRO_SWAP_STANDALONE_SKILL_SLUG,
  TELEPORT_STANDALONE_SKILL_SLUG,
} from "@/service/opencut/standalone-engine-slugs";

describe("resolveClipInspectorKind", () => {
  it("distinguishes scroswap, teleport, talking-head, and explainer clips", () => {
    assert.equal(resolveClipInspectorKind(SCRO_SWAP_STANDALONE_SKILL_SLUG), "scroswap");
    assert.equal(resolveClipInspectorKind(TELEPORT_STANDALONE_SKILL_SLUG), "teleport");
    assert.equal(resolveClipInspectorKind("talking-head-director"), "talking-head");
    assert.equal(resolveClipInspectorKind("paper-cutout-explainer-video-director"), "explainer");
    assert.equal(resolveClipInspectorKind("cartoon-explainer-video-director"), "explainer");
    assert.equal(resolveClipInspectorKind(undefined), "explainer");
  });
});

describe("canChangeClipStyle", () => {
  it("allows changing style on explainer and talking-head clips when idle, and blocks standalone swap/teleport or busy clips", () => {
    assert.equal(canChangeClipStyle(null), false);
    assert.equal(
      canChangeClipStyle({ stage: "video_ready", inspectorKind: "scroswap" }),
      false,
    );
    assert.equal(
      canChangeClipStyle({ stage: "video_ready", inspectorKind: "teleport" }),
      false,
    );
    assert.equal(
      canChangeClipStyle({ stage: "frames_generating", inspectorKind: "explainer" }),
      false,
    );
    assert.equal(
      canChangeClipStyle({ stage: "video_generating", inspectorKind: "talking-head" }),
      false,
    );
    assert.equal(
      canChangeClipStyle({ stage: "frames_ready", inspectorKind: "explainer" }),
      true,
    );
    assert.equal(
      canChangeClipStyle({ stage: "video_ready", inspectorKind: "talking-head" }),
      true,
    );
  });
});

describe("applyClipStyleToStoryboardClips", () => {
  it("updates styleId on the target clipNumber while leaving other clips untouched", () => {
    const rows = [
      { clipNumber: 1, explainerScene: "Clip 1" },
      { clipNumber: 2, explainerScene: "Clip 2", styleId: "realistic" },
    ];
    const updated = applyClipStyleToStoryboardClips(rows, 2, "japanese-anime");
    assert.equal(updated[0]?.styleId, undefined);
    assert.equal(updated[1]?.styleId, "japanese-anime");
  });
});
