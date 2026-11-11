import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId } from "mongodb";
import { clipAppendTasks, isCurrentTask, jobListQuery, phaseATask, postTask, RECENT_SETTLED_MS, reelTask, taskDetail, taskDetailI18n, taskStage } from "@/service/generation/task-list";

test("status maps to the five UI stages", () => {
  assert.equal(taskStage("pending"), "queued");
  assert.equal(taskStage("submitting"), "sending");
  assert.equal(taskStage("queued"), "generating");
  assert.equal(taskStage("in_progress"), "generating");
  assert.equal(taskStage("completed"), "done");
  assert.equal(taskStage("failed"), "failed");
  assert.equal(taskStage("nsfw"), "failed");
});

test("detail names the clip and slot", () => {
  assert.equal(taskDetail({ kind: "frame", clipIndex: 1, framePosition: "start" }), "Clip 2 · 起始畫格");
  assert.equal(taskDetail({ kind: "frame", clipIndex: 0, framePosition: "end" }), "Clip 1 · 結尾畫格");
  assert.equal(taskDetail({ kind: "video", clipIndex: 2 }), "Clip 3 · 影片");
  assert.equal(taskDetail({ kind: "still", clipIndex: -1 }), "角色定裝圖");
  assert.equal(taskDetail({ kind: "character", clipIndex: -1 }), "角色藍圖");
  assert.equal(taskDetail({ kind: "character", clipIndex: -1, characterSlot: "profile" }), "角色頭像");
  assert.equal(taskDetail({ kind: "reelCover", clipIndex: 0 }), "影片封面");
  assert.equal(taskDetail({ kind: "stylePreview", clipIndex: 0 }), "風格預覽");
  assert.equal(taskDetail({ kind: "textStylePreview", clipIndex: 0 }), "文字樣式樣本");
  assert.equal(taskDetail({ kind: "postPreview", clipIndex: 0 }), "海報預覽");
  assert.equal(taskDetail({ kind: "objectSheet", clipIndex: -1 }), "道具參考表");
  assert.equal(taskDetail({ kind: "backgroundPlate", clipIndex: -1 }), "場景背景參考");
  // A plate is labeled as a subtitle plate, never as a start frame.
  assert.equal(taskDetail({ kind: "subtitlePlate", clipIndex: 1 }), "Clip 2 · 字幕圖");
  assert.deepEqual(taskDetailI18n({ kind: "subtitlePlate", clipIndex: 1 }), {
    detailKey: "tasksPage.detail.clipSubtitlePlate",
    detailParams: { n: 2 },
  });
  assert.equal(taskDetail({ kind: "poseEdit", clipIndex: -1 }), "改圖");
  assert.deepEqual(taskDetailI18n({ kind: "poseEdit", clipIndex: -1 }), {
    detailKey: "tasksPage.detail.poseEdit",
  });
  assert.equal(taskDetail({ kind: "onscreenText", clipIndex: 0 }), "畫面文字");
  assert.deepEqual(taskDetailI18n({ kind: "onscreenText", clipIndex: 0 }), {
    detailKey: "tasksPage.detail.onscreenText",
  });
});

test("a reel in progress is a 成片合成 background task", () => {
  const now = Date.parse("2026-09-28T08:00:00.000Z");
  const task = reelTask(
    {
      videoId: "v1",
      projectId: "p1",
      title: "雪山",
      reelStatus: "in_progress",
      updatedAt: new Date(now).toISOString(),
    },
    now,
  );
  assert.equal(task?.detail, "成片合成");
  assert.equal(task?.stage, "generating");
  assert.equal(task?.isVideo, true);
  assert.equal(
    reelTask(
      {
        videoId: "v1",
        projectId: "p1",
        title: "雪山",
        reelStatus: "completed",
        reelUrl: "https://blob/reel.mp4",
        updatedAt: new Date(now - RECENT_SETTLED_MS - 1).toISOString(),
      },
      now,
    ),
    null,
  );
});

test("a queued clip write is a background task", () => {
  const now = Date.parse("2026-10-30T12:00:00.000Z");
  const tasks = clipAppendTasks(
    {
      videoId: "v1",
      projectId: "p1",
      title: "萬聖節",
      jobs: [
        {
          id: "job",
          content: "hidden",
          insertAt: 6,
          status: "writing",
          createdAt: new Date(now),
        },
      ],
    },
    now,
  );
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0]?.kind, "clipAppend");
  assert.equal(tasks[0]?.stage, "generating");
  assert.equal(tasks[0]?.detailKey, "tasksPage.detail.clipAppend");
  assert.equal(JSON.stringify(tasks[0]).includes("hidden"), false);
});

test("jobListQuery uses a single projectId for one video", () => {
  const id = new ObjectId();
  const cutoff = new Date("2026-09-28T00:00:00.000Z");
  const query = jobListQuery({ videoIds: [id], characterIds: [], cutoff });
  assert.equal(query?.$and[0].projectId, id);
});

test("jobListQuery includes style preview jobs by userStyleId", () => {
  const styleId = new ObjectId();
  const cutoff = new Date("2026-09-28T00:00:00.000Z");
  const query = jobListQuery({ videoIds: [], characterIds: [], userStyleIds: [styleId], cutoff });
  assert.equal(query?.$and[0].userStyleId, styleId);
});

test("default list keeps pending and fresh settled, drops old history", () => {
  const now = Date.parse("2026-09-28T08:00:00.000Z");
  const fresh = new Date(now - 10 * 60 * 1000).toISOString();
  const stale = new Date(now - RECENT_SETTLED_MS - 1).toISOString();
  assert.equal(isCurrentTask("queued", stale, now), true);
  assert.equal(isCurrentTask("generating", stale, now), true);
  assert.equal(isCurrentTask("done", fresh, now), true);
  assert.equal(isCurrentTask("failed", fresh, now), true);
  assert.equal(isCurrentTask("done", stale, now), false);
  assert.equal(isCurrentTask("failed", stale, now), false);
});

test("postTask formats a Post Studio job for the global task banner", () => {
  const now = Date.parse("2026-11-04T10:00:00.000Z");
  const id = new ObjectId("65f000000000000000000099");
  const task = postTask(
    {
      _id: id,
      clerkUserId: "u1",
      status: "completed",
      prompt: "Matcha Drop Poster",
      aspectRatio: "9:16",
      currentImageUrl: "https://blob.example/post.webp",
      revisions: [],
      createdAt: new Date(now),
      updatedAt: new Date(now),
    },
    now,
  );
  assert.ok(task);
  assert.equal(task.id, `post:${id.toHexString()}`);
  assert.equal(task.stage, "done");
  assert.equal(task.title, "Matcha Drop Poster");
  assert.equal(task.href, `/app/posts?id=${id.toHexString()}`);
});

test("phaseATask surfaces an active phase_a video while the AI director is writing the storyboard", () => {
  const now = Date.parse("2026-11-05T15:48:00.000Z");
  const active = phaseATask(
    {
      videoId: "6aeca514c9b6cd6e8a851675",
      projectId: "",
      title: "剪紙解說測試",
      status: "phase_a",
      createdAt: new Date(now - 30_000).toISOString(),
      updatedAt: new Date(now - 30_000).toISOString(),
    },
    now,
  );
  assert.ok(active);
  assert.equal(active.id, "phase-a:6aeca514c9b6cd6e8a851675");
  assert.equal(active.kind, "phaseA");
  assert.equal(active.stage, "generating");
  assert.equal(active.detailKey, "tasksPage.detail.phaseA");
  assert.equal(active.videoId, "6aeca514c9b6cd6e8a851675");

  // Once status leaves phase_a into production, phaseATask returns null (frame/video jobs take over)
  const inProd = phaseATask(
    {
      videoId: "6aeca514c9b6cd6e8a851675",
      projectId: "",
      title: "剪紙解說測試",
      status: "production",
      createdAt: new Date(now - 60_000).toISOString(),
      updatedAt: new Date(now).toISOString(),
    },
    now,
  );
  assert.equal(inProd, null);

  // When a stale phase_a video is retried days later, createdAt on the task reflects updatedAt (not 182h ago)
  const retriedAt = new Date(now - 15_000).toISOString();
  const retried = phaseATask(
    {
      videoId: "6ae371a6a80430baa9a46611",
      projectId: "6ab94350d482010afc6f50c8",
      title: "未命名影片",
      status: "phase_a",
      createdAt: new Date(now - 182 * 3600_000).toISOString(),
      updatedAt: retriedAt,
    },
    now,
  );
  assert.ok(retried);
  assert.equal(retried.createdAt, retriedAt);

  // An abandoned phase_a video whose updatedAt is older than 15 minutes is not surfaced as an active task
  const abandoned = phaseATask(
    {
      videoId: "6ae371a6a80430baa9a46611",
      projectId: "6ab94350d482010afc6f50c8",
      title: "未命名影片",
      status: "phase_a",
      createdAt: new Date(now - 182 * 3600_000).toISOString(),
      updatedAt: new Date(now - 20 * 60_000).toISOString(),
    },
    now,
  );
  assert.equal(abandoned, null);
});
