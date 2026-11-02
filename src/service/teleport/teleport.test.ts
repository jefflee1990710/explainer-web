import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
import { buildMinimaxH3Ref2VaBody } from "@/service/jutsu/minimax-h3-ref2va";
import { cutSubjectOntoPlain } from "@/service/teleport/identity-frame";
import {
  buildTeleportRelocatePrompt,
  buildTeleportScenePlatePrompt,
  buildTeleportVideoPrompt,
  chooseTeleportVideoEngine,
  teleportTaskTitle,
} from "@/service/teleport/prompts";
import {
  isAllowedTeleportMediaUrl,
  normalizeTeleportStart,
  teleportSubmitDurationSeconds,
} from "@/service/teleport/start-input";

test("normalizeTeleportStart requires a scene photo or text and clamps the section", () => {
  const missing = normalizeTeleportStart({
    sourceVideoUrl: "https://example.public.blob.vercel-storage.com/a.mp4",
    scenePrompt: "   ",
  });
  assert.deepEqual(missing, { ok: false, error: "請上傳場景照或寫下場景" });

  const both = normalizeTeleportStart({
    sourceVideoUrl: "  https://example.public.blob.vercel-storage.com/a.mp4  ",
    sectionStart: -3,
    sectionLength: 1,
    sceneImageUrl: " https://example.public.blob.vercel-storage.com/room.png ",
    scenePrompt: "  rainy night  ",
    keepSourceAudio: false,
  });
  assert.equal(both.ok, true);
  if (!both.ok) return;
  assert.equal(both.sectionStart, 0);
  assert.equal(both.sectionLength, 2);
  assert.equal(both.scenePrompt, "rainy night");
  assert.equal(both.sceneImageUrl, "https://example.public.blob.vercel-storage.com/room.png");
  assert.equal(both.keepSourceAudio, false);
  assert.equal(both.applyColorFix, true);
});

test("isAllowedTeleportMediaUrl matches the Scro Swap blob rule", () => {
  const host = "abc.public.blob.vercel-storage.com";
  assert.equal(isAllowedTeleportMediaUrl("http://x/a.mp4", "user-1", host), false);
  assert.equal(isAllowedTeleportMediaUrl("https://evil.example/a.mp4", "user-1", null), true);
  assert.equal(isAllowedTeleportMediaUrl("https://evil.example/a.mp4", "user-1", host), false);
  assert.equal(
    isAllowedTeleportMediaUrl("https://other.public.blob.vercel-storage.com/a.png", "user-1", host),
    true,
  );
  assert.equal(
    isAllowedTeleportMediaUrl(
      `https://${host}/explainer/brand/user-1/room.png`,
      "user-1",
      host,
    ),
    true,
  );
});

test("teleport duration and task title", () => {
  assert.equal(teleportSubmitDurationSeconds(2), 5);
  assert.equal(teleportSubmitDurationSeconds(6), 6);
  assert.equal(teleportSubmitDurationSeconds(20), 15);
  assert.equal(teleportTaskTitle("   "), "Teleport");
  assert.equal(teleportTaskTitle("雨夜咖啡館\n第二行"), "雨夜咖啡館");
  assert.equal(teleportTaskTitle("一二三四五六七八九十一二三四五六七八九十一二三四五六七八九十一二三四五"), "一二三四五六七八九十一二三四五六七八九十一二三四五六七八九十一二三四五");
});

test("scene plate prompt has no people, and photo-plus-text relocate keeps the place", () => {
  const plate = buildTeleportScenePlatePrompt("a rainy cafe");
  assert.match(plate, /no people/i);
  assert.match(plate, /a rainy cafe/);

  const relocate = buildTeleportRelocatePrompt({
    moment: "start",
    scenePrompt: "make it a rainy night",
  });
  assert.match(relocate, /Attached image 1/);
  assert.match(relocate, /Attached image 2/);
  assert.match(relocate, /make it a rainy night/);
  assert.match(relocate, /Do not invent a different location/);
});

test("chooseTeleportVideoEngine requires both a mannequin and a MiniMax key", () => {
  assert.equal(chooseTeleportVideoEngine({ hasMannequin: true, hasMinimaxKey: true }), "h3");
  assert.equal(chooseTeleportVideoEngine({ hasMannequin: false, hasMinimaxKey: true }), "hailuo");
  assert.equal(chooseTeleportVideoEngine({ hasMannequin: true, hasMinimaxKey: false }), "hailuo");
});

test("teleport H3 prompt locks the new scene and can ignore a raw identity background", () => {
  const prompt = buildTeleportVideoPrompt({
    engine: "h3",
    motionText: "She turns her head.",
    scenePrompt: "rainy night",
    identityIgnoresBackground: true,
  });
  assert.match(prompt, /Reference image 1/);
  assert.match(prompt, /Reference image 2/);
  assert.match(prompt, /Reference video 1/);
  assert.match(prompt, /Ignore the background of reference image 2/);
  assert.match(prompt, /rainy night/);
  assert.match(prompt, /She turns her head/);
  assert.doesNotMatch(prompt, /mouths stay naturally relaxed/i);

  const body = buildMinimaxH3Ref2VaBody({
    prompt,
    preparedImageUrl: "https://blob.test/prepared.webp",
    identityImageUrl: "https://blob.test/identity.webp",
    mannequinVideoUrl: "https://blob.test/mann.mp4",
    noLipSync: false,
    durationSeconds: 6,
    aspectRatio: "9:16",
  });
  const content = body.content as Array<{ type: string; role?: string }>;
  assert.deepEqual(
    content.map((item) => item.role ?? item.type),
    ["text", "reference_image", "reference_image", "reference_video"],
  );
  assert.equal(body.resolution, "2K");
  assert.equal(body.ratio, "9:16");
  assert.equal("first_frame" in body, false);
  assert.equal("last_frame" in body, false);
});

test("hailuo teleport prompt starts at the first prepared frame and ends at the last", () => {
  const prompt = buildTeleportVideoPrompt({
    engine: "hailuo",
    motionText: "She steps forward.",
    identityIgnoresBackground: false,
  });
  assert.match(prompt, /first frame/i);
  assert.match(prompt, /last frame/i);
  assert.match(prompt, /She steps forward/);
  assert.doesNotMatch(prompt, /Ignore the background of reference image 2/);
});

test("cutSubjectOntoPlain keeps masked pixels and paints the rest plain grey", async () => {
  const frame = await sharp({
    create: { width: 2, height: 2, channels: 3, background: { r: 200, g: 10, b: 10 } },
  })
    .png()
    .toBuffer();
  const mask = Uint8Array.from([1, 0, 0, 0]);
  const cut = await cutSubjectOntoPlain(frame, mask, 2, 2);
  const { data } = await sharp(cut).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.ok(data[0] > 150 && data[1] < 40);
  assert.ok(data[4] > 220 && data[5] > 220 && data[6] > 220);
});

import { ObjectId } from "mongodb";
import { teleportTask } from "@/service/generation/task-list";

test("teleportTask lists rendering and completed jobs on /app/teleport", () => {
  const now = Date.now();
  const id = new ObjectId();
  const rendering = teleportTask(
    {
      _id: id,
      userId: new ObjectId(),
      clerkUserId: "u1",
      status: "rendering",
      sourceVideoUrl: "https://blob.test/src.mp4",
      aspectRatio: "9:16",
      sectionStart: 0,
      sectionLength: 6,
      scenePrompt: "雨夜咖啡館\n忽略",
      createdAt: new Date(now - 5000),
      updatedAt: new Date(now - 1000),
    },
    now,
  );
  assert.equal(rendering?.kind, "teleport");
  assert.equal(rendering?.stage, "generating");
  assert.equal(rendering?.title, "雨夜咖啡館");
  assert.equal(rendering?.detailKey, "tasksPage.detail.teleport");
  assert.equal(rendering?.href, "/app/teleport");

  const done = teleportTask(
    {
      _id: id,
      userId: new ObjectId(),
      clerkUserId: "u1",
      status: "completed",
      sourceVideoUrl: "https://blob.test/src.mp4",
      aspectRatio: "9:16",
      sectionStart: 0,
      sectionLength: 6,
      outputVideoUrl: "https://blob.test/out.mp4",
      preparedStartFrameUrl: "https://blob.test/start.webp",
      createdAt: new Date(now - 5000),
      updatedAt: new Date(now - 1000),
    },
    now,
  );
  assert.equal(done?.stage, "done");
  assert.equal(done?.title, "Teleport");
  assert.equal(done?.previewUrl, "https://blob.test/out.mp4");
});

test("normalizeTeleportStart defaults aspectRatio to 9:16 and preserves custom aspectRatio", () => {
  const def = normalizeTeleportStart({
    sourceVideoUrl: "https://example.public.blob.vercel-storage.com/a.mp4",
    scenePrompt: "snowy street",
  });
  assert.equal(def.ok && def.aspectRatio, "9:16");

  const wide = normalizeTeleportStart({
    sourceVideoUrl: "https://example.public.blob.vercel-storage.com/a.mp4",
    scenePrompt: "snowy street",
    aspectRatio: "16:9",
    targetVideoId: "507f1f77bcf86cd799439011",
    targetClipNumber: 3,
    previousClipVideoUrl: "https://example.public.blob.vercel-storage.com/old.mp4",
  });
  assert.equal(wide.ok && wide.aspectRatio, "16:9");
  assert.equal(wide.ok && wide.targetClipNumber, 3);
  assert.equal(buildTeleportScenePlatePrompt("snowy street", "16:9").includes("16:9"), true);
});
