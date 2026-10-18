import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeCardPipelineProgress,
  computeVideoPipelineProgress,
  summarizeVideoLocks,
} from "@/service/video-progress-steps";

describe("video-progress-steps", () => {
  it("reports step 1/5 while Phase A storyboard is writing", () => {
    const progress = computeVideoPipelineProgress({
      status: "phase_a",
      clips: [],
      frames: [],
    });
    assert.equal(progress.step, 1);
    assert.equal(progress.stepFraction, "1/5");
    assert.equal(progress.stageId, "storyboard");
    assert.equal(progress.busy, true);
    assert.equal(progress.steps.length, 5);
    assert.equal(progress.steps[0]?.state, "current");
    assert.equal(progress.steps[1]?.state, "todo");
  });

  it("reports step 2/5 while prop sheet or 3x3 background plates are generating", () => {
    const progress = computeVideoPipelineProgress({
      status: "production",
      phaseA: { clips: [{ clipNumber: 1, durationSeconds: 5 }] },
      objectSheetItems: [{ name: "Golden Scroll", notes: "glowing" }],
      objectSheetUrl: undefined,
      backgroundPlates: [
        { setId: "studio", name: "Warm Studio", clipNumbers: [1], url: undefined },
      ],
      frames: [],
      clips: [],
    });
    assert.equal(progress.step, 2);
    assert.equal(progress.stepFraction, "2/5");
    assert.equal(progress.stageId, "locks");
    assert.equal(progress.busy, true);
    assert.equal(progress.locks.propsTotal, 1);
    assert.equal(progress.locks.propsDone, 0);
    assert.equal(progress.locks.platesTotal, 1);
    assert.equal(progress.locks.platesDone, 0);
    assert.equal(progress.steps[0]?.state, "done");
    assert.equal(progress.steps[1]?.state, "current");
  });

  it("reports step 3/5 while scene keyframes are generating or incomplete", () => {
    const progress = computeVideoPipelineProgress({
      status: "production",
      phaseA: { clips: [{ clipNumber: 1, durationSeconds: 5 }] },
      objectSheetItems: [{ name: "Golden Scroll", notes: "glowing" }],
      objectSheetUrl: "https://example.com/props.png",
      backgroundPlates: [
        { setId: "studio", name: "Warm Studio", clipNumbers: [1], url: "https://example.com/plate.png" },
      ],
      frames: [
        {
          clipNumber: 1,
          position: "start",
          prompt: "p",
          status: "in_progress",
        },
        {
          clipNumber: 1,
          position: "end",
          prompt: "p",
          status: "queued",
        },
      ],
      clips: [],
    });
    assert.equal(progress.step, 3);
    assert.equal(progress.stepFraction, "3/5");
    assert.equal(progress.stageId, "frames");
    assert.equal(progress.busy, true);
    assert.equal(progress.framesGenerating, 1);
    assert.equal(progress.framesQueued, 1);
    assert.equal(progress.steps[0]?.state, "done");
    assert.equal(progress.steps[1]?.state, "done");
    assert.equal(progress.steps[2]?.state, "current");
  });

  it("reports step 4/5 when frames are ready and video is generating or waiting", () => {
    const progress = computeVideoPipelineProgress({
      status: "production",
      phaseA: { clips: [{ clipNumber: 1, durationSeconds: 5 }] },
      frames: [
        {
          clipNumber: 1,
          position: "start",
          prompt: "p",
          status: "completed",
          blobUrl: "https://example.com/start.png",
        },
        {
          clipNumber: 1,
          position: "end",
          prompt: "p",
          status: "completed",
          blobUrl: "https://example.com/end.png",
        },
      ],
      clips: [
        {
          clipNumber: 1,
          durationSeconds: 5,
          prompt: "v",
          status: "in_progress",
        },
      ],
    });
    assert.equal(progress.step, 4);
    assert.equal(progress.stepFraction, "4/5");
    assert.equal(progress.stageId, "videos");
    assert.equal(progress.busy, true);
    assert.equal(progress.videosGenerating, 1);
    assert.equal(progress.framesDone, 1);
  });

  it("reports step 5/5 when all clip videos are completed", () => {
    const progress = computeVideoPipelineProgress({
      status: "ready",
      phaseA: { clips: [{ clipNumber: 1, durationSeconds: 5 }] },
      frames: [
        {
          clipNumber: 1,
          position: "start",
          prompt: "p",
          status: "completed",
          blobUrl: "https://example.com/start.png",
        },
        {
          clipNumber: 1,
          position: "end",
          prompt: "p",
          status: "completed",
          blobUrl: "https://example.com/end.png",
        },
      ],
      clips: [
        {
          clipNumber: 1,
          durationSeconds: 5,
          prompt: "v",
          status: "completed",
          blobUrl: "https://example.com/clip1.mp4",
        },
      ],
    });
    assert.equal(progress.step, 5);
    assert.equal(progress.stepFraction, "5/5");
    assert.equal(progress.stageId, "ready");
    assert.equal(progress.busy, false);
    assert.equal(progress.percent, 100);
    assert.ok(progress.steps.every((item) => item.state === "done"));
  });

  it("summarizes card progress across all 5 steps", () => {
    const step2 = computeCardPipelineProgress({
      status: "production",
      videosDone: 0,
      videosTotal: 2,
      tags: [
        { clipNumber: 1, kind: "scene", state: "pending" },
        { clipNumber: 1, kind: "video", state: "pending" },
      ],
      locksBusy: true,
      propsTotal: 1,
      propsDone: 0,
      platesTotal: 1,
      platesDone: 0,
    });
    assert.equal(step2.stepFraction, "2/5");
    assert.equal(step2.stageId, "locks");
    assert.equal(step2.busy, true);

    const step5 = computeCardPipelineProgress({
      status: "ready",
      videosDone: 1,
      videosTotal: 1,
      tags: [
        { clipNumber: 1, kind: "scene", state: "ready" },
        { clipNumber: 1, kind: "video", state: "ready" },
      ],
    });
    assert.equal(step5.stepFraction, "5/5");
    assert.equal(step5.stageId, "ready");
  });

  it("extracts lock names in summarizeVideoLocks", () => {
    const locks = summarizeVideoLocks({
      objectSheetItems: [{ name: " Cup " }, { name: "Book" }],
      backgroundPlates: [{ setId: "s1", name: "Desk", clipNumbers: [1] }],
    });
    assert.deepEqual(locks.propNames, ["Cup", "Book"]);
    assert.deepEqual(locks.plateNames, ["Desk"]);
    assert.equal(locks.locksBusy, true);
  });
});
