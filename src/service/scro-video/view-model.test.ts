import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { scroVideosFor, type ScroVideoSource } from "@/service/scro-video/view-model";

function baseProject(overrides: Partial<ScroVideoSource> = {}): ScroVideoSource {
  return {
    status: "production",
    phaseA: {
      clips: [
        {
          clipNumber: 1,
          durationSeconds: 5,
          englishVo: "Hello",
          explainerScene: "A room",
          motionCamera: "Push in",
        },
      ],
    },
    frames: [],
    clips: [],
    ...overrides,
  };
}

describe("scroVideosFor", () => {
  it("maps empty stills to awaiting_frames", () => {
    const views = scroVideosFor(baseProject());
    assert.equal(views.length, 1);
    assert.equal(views[0].stage, "awaiting_frames");
    assert.equal(views[0].durationSeconds, 5);
    assert.equal(views[0].englishVo, "Hello");
  });

  it("uses start poster while video generates", () => {
    const views = scroVideosFor(
      baseProject({
        frames: [
          {
            clipNumber: 1,
            position: "start",
            status: "completed",
            blobUrl: "https://cdn.example/start.webp",
            prompt: "",
          },
          {
            clipNumber: 1,
            position: "end",
            status: "completed",
            blobUrl: "https://cdn.example/end.webp",
            prompt: "",
          },
        ],
        clips: [
          {
            clipNumber: 1,
            status: "in_progress",
            prompt: "",
          },
        ],
      }),
    );
    assert.equal(views[0].stage, "video_generating");
    assert.equal(views[0].posterUrl, "https://cdn.example/start.webp");
    assert.equal(views[0].videoUrl, undefined);
  });

  it("exposes videoUrl when video_ready", () => {
    const views = scroVideosFor(
      baseProject({
        frames: [
          {
            clipNumber: 1,
            position: "start",
            status: "completed",
            blobUrl: "https://cdn.example/start.webp",
            prompt: "",
          },
          {
            clipNumber: 1,
            position: "end",
            status: "completed",
            blobUrl: "https://cdn.example/end.webp",
            prompt: "",
          },
        ],
        clips: [
          {
            clipNumber: 1,
            status: "completed",
            blobUrl: "https://cdn.example/clip.mp4",
            prompt: "",
          },
        ],
      }),
    );
    assert.equal(views[0].stage, "video_ready");
    assert.equal(views[0].videoUrl, "https://cdn.example/clip.mp4");
  });

  it("orders by clipNumber", () => {
    const views = scroVideosFor(
      baseProject({
        phaseA: {
          clips: [
            { clipNumber: 3, durationSeconds: 4 },
            { clipNumber: 1, durationSeconds: 5 },
            { clipNumber: 2, durationSeconds: 6 },
          ],
        },
      }),
    );
    assert.deepEqual(
      views.map((view) => view.clipNumber),
      [1, 2, 3],
    );
  });

  it("maps failed frames to failed", () => {
    const views = scroVideosFor(
      baseProject({
        frames: [
          {
            clipNumber: 1,
            position: "start",
            status: "failed",
            error: "boom",
            prompt: "",
          },
        ],
      }),
    );
    assert.equal(views[0].stage, "failed");
    assert.equal(views[0].error, "boom");
  });
});
