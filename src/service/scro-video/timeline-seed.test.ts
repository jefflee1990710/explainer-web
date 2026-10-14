import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildSeedClips,
  diffScroSeedClips,
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
