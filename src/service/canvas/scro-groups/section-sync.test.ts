import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CanvasGroup, CanvasNode } from "@/model/canvas";
import { renderDurationForTrim } from "@/service/canvas/scro-groups/section-sync";

const n = (id: string, modelId: string): CanvasNode => ({ id, type: "model", position: { x: 0, y: 0 }, data: { modelId } });
const group: CanvasGroup = { id: "swap-1", title: "S", color: "violet", kind: "swap", memberIds: ["swap-1-trim", "swap-1-render"] };

describe("renderDurationForTrim", () => {
  it("sets the render length to the trimmed section, clamped to the section limits", () => {
    const nodes = [n("swap-1-trim", "ffmpeg:trim-speed"), n("swap-1-render", "scro:swap-render")];
    assert.deepEqual(renderDurationForTrim(nodes, group, { ffmpegStartSec: 2, ffmpegEndSec: 9 }), {
      renderId: "swap-1-render",
      durationSeconds: 7,
    });
    assert.equal(renderDurationForTrim(nodes, group, { ffmpegStartSec: 0, ffmpegEndSec: 40 })?.durationSeconds, 15);
    assert.equal(renderDurationForTrim(nodes, group, { ffmpegStartSec: 0 }), undefined);
    assert.equal(renderDurationForTrim(nodes, { ...group, kind: "life" }, { ffmpegEndSec: 5 }), undefined);
  });
});
