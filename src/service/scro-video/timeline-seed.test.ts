import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildSeedClips,
  diffScroSeedClips,
  staleTimelineElementIds,
  storyboardLayoutAction,
} from "@/service/scro-video/timeline-seed";
import type { ScroVideoSource } from "@/service/scro-video/view-model";

const sampleProject: ScroVideoSource = {
  status: "production",
  phaseA: {
    clips: [
      { clipNumber: 2, durationSeconds: 6 },
      { clipNumber: 1, durationSeconds: 5 },
      { clipNumber: 3, durationSeconds: 4 },
    ],
  },
  frames: [],
  clips: [],
};

describe("buildSeedClips", () => {
  it("orders by clipNumber and uses storyboard duration", () => {
    const rows = buildSeedClips(sampleProject);
    assert.deepEqual(
      rows.map((row) => row.clipNumber),
      [1, 2, 3],
    );
    assert.equal(rows[0].durationSeconds, 5);
    assert.equal(rows[0].name, "Clip 1");
  });

  it("keeps a completed end still so it can be added on its own", () => {
    const rows = buildSeedClips({
      ...sampleProject,
      frames: [
        {
          clipNumber: 1,
          position: "end",
          status: "completed",
          prompt: "",
          blobUrl: "https://cdn.example/end.webp",
        },
      ],
    });
    assert.equal(rows[0].endPosterUrl, "https://cdn.example/end.webp");
    assert.equal(rows[1].endPosterUrl, undefined);
  });

  it("shows the next clip's start as a talking-head clip's end", () => {
    const rows = buildSeedClips({
      ...sampleProject,
      skillSlug: "talking-head-director",
      frames: [
        { clipNumber: 1, position: "start", status: "completed", prompt: "", blobUrl: "s1" },
        { clipNumber: 2, position: "start", status: "completed", prompt: "", blobUrl: "s2" },
        { clipNumber: 3, position: "start", status: "in_progress", prompt: "" },
        { clipNumber: 3, position: "end", status: "completed", prompt: "", blobUrl: "e3" },
      ],
    });
    assert.deepEqual(
      rows.map((row) => [row.posterUrl, row.endPosterUrl, row.endFromClipNumber, row.endPending]),
      [
        ["s1", "s2", 2, false],
        ["s2", undefined, 3, true],
        ["e3", "e3", undefined, false],
      ],
    );
  });
});

describe("storyboard layout", () => {
  it("places clips when a storyboard first appears", () => {
    assert.equal(
      storyboardLayoutAction({ synced: true, previousCount: 0, nextCount: 4 }),
      "place",
    );
  });

  it("clears the cut when recreate wipes the storyboard", () => {
    assert.equal(
      storyboardLayoutAction({ synced: true, previousCount: 4, nextCount: 0 }),
      "clear",
    );
  });

  it("keeps a hand-arranged cut while frames and videos update", () => {
    assert.equal(
      storyboardLayoutAction({ synced: true, previousCount: 4, nextCount: 4 }),
      "keep",
    );
    assert.equal(
      storyboardLayoutAction({ synced: false, previousCount: 0, nextCount: 4 }),
      "keep",
    );
  });
});

describe("staleTimelineElementIds", () => {
  it("drops old videos before the next render and drops clips that left the storyboard", () => {
    const ids = staleTimelineElementIds({
      elements: [
        { id: "v1", type: "video", clipNumber: 1 },
        { id: "still2", type: "image", clipNumber: 2 },
        { id: "v4", type: "video", clipNumber: 4 },
        { id: "ending", type: "video", clipNumber: null },
      ],
      clips: [
        { clipNumber: 1 },
        { clipNumber: 2, videoUrl: undefined },
        { clipNumber: 3, videoUrl: "https://cdn.example/3.mp4" },
      ],
    });
    assert.deepEqual(ids, ["v1", "v4"]);
  });

  it("keeps a video that is still the current render", () => {
    const ids = staleTimelineElementIds({
      elements: [{ id: "v3", type: "video", clipNumber: 3 }],
      clips: [{ clipNumber: 3, videoUrl: "https://cdn.example/3.mp4" }],
    });
    assert.deepEqual(ids, []);
  });
});

describe("diffScroSeedClips", () => {
  it("returns only clips that changed stage or media", () => {
    const previous = buildSeedClips(sampleProject);
    const next = previous.map((clip) =>
      clip.clipNumber === 2
        ? {
            ...clip,
            stage: "frames_ready" as const,
            posterUrl: "https://cdn.example/2.webp",
          }
        : clip,
    );
    const changed = diffScroSeedClips({ previous, next });
    assert.equal(changed.length, 1);
    assert.equal(changed[0].clipNumber, 2);
  });
});
