import assert from "node:assert/strict";
import { test } from "node:test";
import type { ProjectClip } from "@/model/project";
import {
  applyCompletedEngineClip,
  applyFailedEngineClip,
} from "@/service/opencut/clip-jutsu-settle";
import {
  markClipInProgressForEngine,
  resolveClipJutsuSectionLength,
} from "@/service/opencut/clip-jutsu";

test("applyCompletedEngineClip replaces the target clip videoUrl and clears error", () => {
  const initial: ProjectClip[] = [
    {
      clipNumber: 1,
      durationSeconds: 6,
      prompt: "p1",
      status: "in_progress",
      outputUrl: "https://blob/old-1.mp4",
      blobUrl: "https://blob/old-1.mp4",
      error: "old err",
      unsent: true,
    },
    {
      clipNumber: 2,
      durationSeconds: 5,
      prompt: "p2",
      status: "completed",
      outputUrl: "https://blob/c2.mp4",
      blobUrl: "https://blob/c2.mp4",
    },
  ];

  const updated = applyCompletedEngineClip(initial, 1, "https://blob/new-1.mp4");
  assert.equal(updated[0]?.status, "completed");
  assert.equal(updated[0]?.blobUrl, "https://blob/new-1.mp4");
  assert.equal(updated[0]?.outputUrl, "https://blob/new-1.mp4");
  assert.equal(updated[0]?.error, undefined);
  assert.equal(updated[0]?.unsent, false);
  assert.equal(updated[1]?.blobUrl, "https://blob/c2.mp4");
});

test("applyFailedEngineClip restores previousClipVideoUrl when present so the clip does not lose its video", () => {
  const initial: ProjectClip[] = [
    {
      clipNumber: 1,
      durationSeconds: 6,
      prompt: "p1",
      status: "in_progress",
      outputUrl: "https://blob/old-1.mp4",
      blobUrl: "https://blob/old-1.mp4",
    },
  ];

  const restored = applyFailedEngineClip(
    initial,
    1,
    "Teleport 渲染失敗",
    "https://blob/old-1.mp4",
  );
  assert.equal(restored[0]?.status, "completed");
  assert.equal(restored[0]?.blobUrl, "https://blob/old-1.mp4");
  assert.equal(restored[0]?.outputUrl, "https://blob/old-1.mp4");
  assert.equal(restored[0]?.error, "Teleport 渲染失敗");

  const failedNoPrev = applyFailedEngineClip(initial, 1, "Teleport 渲染失敗");
  assert.equal(failedNoPrev[0]?.status, "failed");
  assert.equal(failedNoPrev[0]?.error, "Teleport 渲染失敗");
});

test("resolveClipJutsuSectionLength clamps clip duration into 2..15 seconds", () => {
  assert.equal(resolveClipJutsuSectionLength(1, undefined), 2);
  assert.equal(resolveClipJutsuSectionLength(6.4, undefined), 6);
  assert.equal(resolveClipJutsuSectionLength(undefined, 22), 15);
  assert.equal(resolveClipJutsuSectionLength(undefined, undefined), 6);
});

test("markClipInProgressForEngine sets status to in_progress and updates submittedAt while keeping previous URLs", () => {
  const clips: ProjectClip[] = [
    {
      clipNumber: 2,
      durationSeconds: 6,
      prompt: "p",
      status: "completed",
      blobUrl: "https://blob/c2.mp4",
      outputUrl: "https://blob/c2.mp4",
      error: "stale",
    },
  ];
  const next = markClipInProgressForEngine(clips, 2, "2026-11-02T12:00:00.000Z");
  assert.equal(next[0]?.status, "in_progress");
  assert.equal(next[0]?.submittedAt, "2026-11-02T12:00:00.000Z");
  assert.equal(next[0]?.error, undefined);
  assert.equal(next[0]?.blobUrl, "https://blob/c2.mp4");
});
