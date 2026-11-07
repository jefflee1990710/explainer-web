import assert from "node:assert/strict";
import { test } from "node:test";
import type { ProjectClip } from "@/model/project";
import {
  applyCompletedEngineClip,
  applyFailedEngineClip,
} from "@/service/opencut/clip-jutsu-settle";
import {
  buildExtendedClipInsertion,
  markClipInProgressForEngine,
  resolveClipExtendReferences,
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

test("resolveClipExtendReferences extracts character, scene, and prop references from clip overrides and project defaults", () => {
  const refs = resolveClipExtendReferences(
    {
      phaseA: {
        englishTitle: "T",
        localizedTitle: "T",
        targetDuration: "12s",
        clipCount: 2,
        loopMode: "linear",
        coreMessage: "c",
        hookStrategy: "h",
        aspectRatio: "9:16",
        visualWorld: "v",
        narrator: "n",
        englishWordCount: 10,
        characterLock: "lock",
        palette: "p",
        bgmDirection: "b",
        narrativeArc: "a",
        clips: [
          {
            clipNumber: 1,
            timeRange: "0-6s",
            durationSeconds: 6,
            narrativeJob: "Hook",
            explainerScene: "Scene 1",
            motionCamera: "Cam 1",
            englishVo: "Hello",
            bgmSfx: "sfx",
            backgroundSetId: "set-cafe",
            cast: [
              {
                characterId: "c1",
                name: "Cathy",
                appearance: "casual",
                imageUrl: "https://blob/cathy-clip1.jpg",
              },
            ],
            products: [
              {
                productId: "p1",
                name: "Matcha Cup",
                appearance: "green cup",
                imageUrl: "https://blob/matcha.jpg",
              },
            ],
          },
          {
            clipNumber: 2,
            timeRange: "6-12s",
            durationSeconds: 6,
            narrativeJob: "Body",
            explainerScene: "Scene 2",
            motionCamera: "Cam 2",
            englishVo: "World",
            bgmSfx: "sfx",
            referenceImageIds: ["R1"],
          },
        ],
      },
      cast: [
        {
          characterId: "c-default",
          name: "Default Host",
          appearance: "suit",
          imageUrl: "https://blob/default-host.jpg",
        },
      ],
      characterStillUrl: "https://blob/still-lock.jpg",
      backgroundPlates: [
        {
          setId: "set-cafe",
          name: "Cafe",
          notes: "cozy",
          clipNumbers: [1],
          url: "https://blob/plate-cafe.webp",
        },
      ],
      referenceImages: [
        { id: "R1", url: "https://blob/ref-r1.jpg", description: "street" },
      ],
      products: [
        {
          productId: "p-default",
          name: "Laptop",
          appearance: "silver",
          imageUrl: "https://blob/laptop.jpg",
        },
      ],
      objectSheetUrl: "https://blob/props-sheet.webp",
    },
    1,
  );

  assert.deepEqual(refs.characterImageUrls, ["https://blob/cathy-clip1.jpg"]);
  assert.equal(refs.sceneImageUrl, "https://blob/plate-cafe.webp");
  assert.deepEqual(refs.propImageUrls, [
    "https://blob/matcha.jpg",
    "https://blob/props-sheet.webp",
  ]);

  const refsClip2 = resolveClipExtendReferences(
    {
      phaseA: {
        englishTitle: "T",
        localizedTitle: "T",
        targetDuration: "12s",
        clipCount: 2,
        loopMode: "linear",
        coreMessage: "c",
        hookStrategy: "h",
        aspectRatio: "9:16",
        visualWorld: "v",
        narrator: "n",
        englishWordCount: 10,
        characterLock: "lock",
        palette: "p",
        bgmDirection: "b",
        narrativeArc: "a",
        clips: [
          {
            clipNumber: 2,
            timeRange: "6-12s",
            durationSeconds: 6,
            narrativeJob: "Body",
            explainerScene: "Scene 2",
            motionCamera: "Cam 2",
            englishVo: "World",
            bgmSfx: "sfx",
            referenceImageIds: ["R1"],
          },
        ],
      },
      characterStillUrl: "https://blob/still-lock.jpg",
      referenceImages: [
        { id: "R1", url: "https://blob/ref-r1.jpg", description: "street" },
      ],
      products: [
        {
          productId: "p-default",
          name: "Laptop",
          appearance: "silver",
          imageUrl: "https://blob/laptop.jpg",
        },
      ],
    },
    2,
  );

  assert.deepEqual(refsClip2.characterImageUrls, ["https://blob/still-lock.jpg"]);
  assert.equal(refsClip2.sceneImageUrl, "https://blob/ref-r1.jpg");
  assert.deepEqual(refsClip2.propImageUrls, ["https://blob/laptop.jpg"]);
});

test("buildExtendedClipInsertion inserts Clip N+1 after Clip N, shifts later clips, and marks Clip N+1 in_progress with poster frame", () => {
  const inserted = buildExtendedClipInsertion({
    project: {
      phaseA: {
        englishTitle: "T",
        localizedTitle: "T",
        targetDuration: "12s",
        clipCount: 2,
        loopMode: "linear",
        coreMessage: "c",
        hookStrategy: "h",
        aspectRatio: "9:16",
        visualWorld: "v",
        narrator: "n",
        englishWordCount: 10,
        characterLock: "lock",
        palette: "p",
        bgmDirection: "b",
        narrativeArc: "a",
        clips: [
          {
            clipNumber: 1,
            timeRange: "0-6s",
            durationSeconds: 6,
            narrativeJob: "Hook",
            explainerScene: "Scene 1",
            motionCamera: "Cam 1",
            englishVo: "Hello",
            bgmSfx: "sfx",
            styleId: "realistic",
          },
          {
            clipNumber: 2,
            timeRange: "6-12s",
            durationSeconds: 6,
            narrativeJob: "Outro",
            explainerScene: "Scene 2",
            motionCamera: "Cam 2",
            englishVo: "Bye",
            bgmSfx: "sfx",
          },
        ],
      },
      frames: [
        {
          clipNumber: 1,
          position: "start" as const,
          prompt: "f1s",
          status: "completed" as const,
          outputUrl: "https://blob/f1-start.webp",
          blobUrl: "https://blob/f1-start.webp",
        },
        {
          clipNumber: 1,
          position: "end" as const,
          prompt: "f1e",
          status: "completed" as const,
          outputUrl: "https://blob/f1-end.webp",
          blobUrl: "https://blob/f1-end.webp",
        },
        {
          clipNumber: 2,
          position: "start" as const,
          prompt: "f2s",
          status: "completed" as const,
          outputUrl: "https://blob/f2-start.webp",
          blobUrl: "https://blob/f2-start.webp",
        },
      ],
      clips: [
        {
          clipNumber: 1,
          durationSeconds: 6,
          prompt: "p1",
          status: "completed" as const,
          outputUrl: "https://blob/c1.mp4",
          blobUrl: "https://blob/c1.mp4",
        },
        {
          clipNumber: 2,
          durationSeconds: 6,
          prompt: "p2",
          status: "completed" as const,
          outputUrl: "https://blob/c2.mp4",
          blobUrl: "https://blob/c2.mp4",
        },
      ],
    },
    sourceClipNumber: 1,
    extensionPrompt: "She walks forward and waves at the camera.",
    nowIso: "2026-11-07T12:00:00.000Z",
  });

  assert.equal(inserted.ok, true);
  if (!inserted.ok) return;
  assert.equal(inserted.newClipNumber, 2);
  assert.equal(inserted.posterUrl, "https://blob/f1-end.webp");
  assert.deepEqual(
    inserted.project.phaseA?.clips.map((c) => c.clipNumber),
    [1, 2, 3],
  );
  assert.equal(
    inserted.project.phaseA?.clips[1]?.explainerScene,
    "She walks forward and waves at the camera.",
  );
  // Old clip 2 was shifted to clip 3
  const clip3 = inserted.project.clips.find((c) => c.clipNumber === 3);
  assert.equal(clip3?.blobUrl, "https://blob/c2.mp4");
  // New clip 2 is in_progress
  const clip2 = inserted.project.clips.find((c) => c.clipNumber === 2);
  assert.equal(clip2?.status, "in_progress");
  assert.equal(clip2?.submittedAt, "2026-11-07T12:00:00.000Z");
  // New clip 2 has a completed start frame seeded with clip 1's end frame
  const frame2Start = inserted.project.frames?.find(
    (f) => f.clipNumber === 2 && f.position === "start",
  );
  assert.equal(frame2Start?.status, "completed");
  assert.equal(frame2Start?.blobUrl, "https://blob/f1-end.webp");
});
