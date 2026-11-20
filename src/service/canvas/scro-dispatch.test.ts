import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ObjectId } from "mongodb";
import type { CanvasNode } from "@/model/canvas";
import type { ResolvedCanvasInputs } from "@/service/canvas/graph";
import {
  executeScroSyncNode,
  pollScroAsyncJob,
  resolveAutoVideoClipNumbers,
  shouldSkipProjectBilling,
  submitScroAsyncNode,
  validateScroToolInputs,
} from "@/service/canvas/scro-dispatch";

function makeNode(
  id: string,
  modelId: string,
  extra?: Partial<CanvasNode["data"]>,
): CanvasNode {
  return {
    id,
    type: "model",
    position: { x: 0, y: 0 },
    data: { modelId, ...extra },
  };
}

function emptyInputs(overrides?: Partial<ResolvedCanvasInputs>): ResolvedCanvasInputs {
  return { refImages: [], videos: [], ...overrides };
}

describe("scro canvas dispatch — validation", () => {
  it("requires startImage or toolParams.characterId for scro:talking-head", () => {
    const res = validateScroToolInputs(
      "scro:talking-head",
      makeNode("th1", "scro:talking-head", { prompt: "Hello" }),
      emptyInputs({ prompt: "Hello" }),
    );
    assert.equal(res.ok, false);
    if (!res.ok) {
      assert.ok(res.missingRequiredFields.includes("startImage"));
    }
  });

  it("requires prompt or refAudio for scro:talking-head", () => {
    const res = validateScroToolInputs(
      "scro:talking-head",
      makeNode("th2", "scro:talking-head", {
        toolParams: { characterId: "char-1" },
      }),
      emptyInputs(),
    );
    assert.equal(res.ok, false);
    if (!res.ok) {
      assert.ok(res.missingRequiredFields.includes("prompt"));
    }
  });

  it("accepts scro:talking-head with refAudio and toolParams.characterId without prompt", () => {
    const res = validateScroToolInputs(
      "scro:talking-head",
      makeNode("th3", "scro:talking-head", {
        toolParams: { characterId: "char-1" },
      }),
      emptyInputs({ refAudio: "https://blob.example/vo.mp3" }),
    );
    assert.deepEqual(res, { ok: true });
  });

  it("requires toolParams.characterId for scro:life and allows prompt without poseId", () => {
    const missing = validateScroToolInputs(
      "scro:life",
      makeNode("life1", "scro:life", { prompt: "Coffee shop morning" }),
      emptyInputs({ prompt: "Coffee shop morning" }),
    );
    assert.equal(missing.ok, false);

    const valid = validateScroToolInputs(
      "scro:life",
      makeNode("life2", "scro:life", {
        prompt: "Coffee shop morning",
        toolParams: { characterId: "char-1" },
      }),
      emptyInputs({ prompt: "Coffee shop morning" }),
    );
    assert.deepEqual(valid, { ok: true });
  });
});

describe("scro canvas dispatch — sync execution", () => {
  it("runs scro:tts, applies speed only when != 1, and returns audio Blob URL", async () => {
    let speedApplied = 0;
    let persistedPath = "";
    const out = await executeScroSyncNode(
      {
        clerkUserId: "user-1",
        jobIdHex: "job123",
        modelId: "scro:tts",
        node: makeNode("tts1", "scro:tts", {
          toolParams: { language: "yue", voicePreset: "alan", ttsSpeed: 1.25 },
        }),
        inputs: emptyInputs({ prompt: "今日同大家介紹一個新功能" }),
      },
      {
        synthesizeSpeech: async () => Buffer.from("raw-mp3"),
        applyAudioSpeed: async (buf, speed) => {
          speedApplied = speed;
          return Buffer.concat([buf, Buffer.from("-fast")]);
        },
        persistAudioBuffer: async (_buf, path) => {
          persistedPath = path;
          return "https://blob.example/canvas/user-1/job123.mp3";
        },
      },
    );

    assert.equal(speedApplied, 1.25);
    assert.equal(persistedPath, "canvas/user-1/job123.mp3");
    assert.equal(out.outputKind, "audio");
    assert.equal(out.outputUrl, "https://blob.example/canvas/user-1/job123.mp3");
  });

  it("runs scro:life and scro:poster via Seedream 5.0 Pro and returns image Blob URL", async () => {
    let seenPrompt = "";
    const lifeOut = await executeScroSyncNode(
      {
        clerkUserId: "user-1",
        jobIdHex: "job456",
        modelId: "scro:life",
        node: makeNode("life1", "scro:life", {
          aspectRatio: "9:16",
          toolParams: { characterId: "char-1" },
        }),
        inputs: emptyInputs({ prompt: "Sitting at a sunlit Hong Kong cafe" }),
      },
      {
        loadCharacterBlueprintUrl: async () => "https://blob.example/char-1.png",
        submitImage: async (input) => {
          seenPrompt = input.prompt;
          return {
            request_id: "req-1",
            status: "completed",
            images: [{ url: "data:image/png;base64,AAAA" }],
          };
        },
        persistImageUrl: async () => "https://blob.example/canvas/user-1/job456.png",
      },
    );

    assert.match(seenPrompt, /Hong Kong cafe/i);
    assert.equal(lifeOut.outputKind, "image");
    assert.equal(lifeOut.outputUrl, "https://blob.example/canvas/user-1/job456.png");
  });
});

describe("scro canvas dispatch — skipBilling, autoProduceAllClips & polling", () => {
  it("recognizes skipBilling and collects all clip numbers when autoProduceAllClips is true", () => {
    assert.equal(shouldSkipProjectBilling({ skipBilling: true }), true);
    assert.equal(shouldSkipProjectBilling({ skipBilling: false }), false);
    assert.deepEqual(
      resolveAutoVideoClipNumbers([1, 2, 3], { autoProduceAllClips: true }),
      [1, 2, 3],
    );
    assert.deepEqual(
      resolveAutoVideoClipNumbers([1, 2, 3], { autoProduceAllClips: false }),
      [1],
    );
  });

  it("polls video, jutsu, and teleport domain jobs into unified status", async () => {
    const vidId = new ObjectId().toHexString();
    const res = await pollScroAsyncJob(
      {
        clerkUserId: "user-1",
        domainKind: "video",
        externalJobId: vidId,
      },
      {
        findVideo: async () => ({
          status: "ready",
          reelStatus: "completed",
          reelUrl: "https://blob.example/reel.mp4",
          clips: [],
        }),
      },
    );
    assert.deepEqual(res, {
      status: "completed",
      outputUrl: "https://blob.example/reel.mp4",
    });

    const failed = await pollScroAsyncJob(
      {
        clerkUserId: "user-1",
        domainKind: "jutsu",
        externalJobId: vidId,
      },
      {
        pollJutsu: async () => ({
          ok: true as const,
          job: {
            id: vidId,
            status: "failed",
            error: "Swap failed",
          } as never,
        }),
      },
    );
    assert.deepEqual(failed, { status: "failed", error: "Swap failed" });
  });

  it("detects failed frames, lock errors, or stillError in pollScroAsyncJob for video domain", async () => {
    const vidId = new ObjectId().toHexString();
    const frameFailed = await pollScroAsyncJob(
      { clerkUserId: "user-1", domainKind: "video", externalJobId: vidId },
      {
        findVideo: async () => ({
          status: "production",
          clips: [],
          frames: [
            {
              clipNumber: 1,
              position: "start",
              prompt: "p",
              status: "failed",
              error: "Image moderation blocked",
            },
          ],
        }),
      },
    );
    assert.deepEqual(frameFailed, {
      status: "failed",
      error: "Image moderation blocked",
    });

    const lockFailed = await pollScroAsyncJob(
      { clerkUserId: "user-1", domainKind: "video", externalJobId: vidId },
      {
        findVideo: async () => ({
          status: "production",
          clips: [],
          stillError: "角色定裝圖產生失敗",
        }),
      },
    );
    assert.deepEqual(lockFailed, {
      status: "failed",
      error: "角色定裝圖產生失敗",
    });
  });

  it("passes clerkUserId to cookie-free ForUser swap & teleport dispatchers and pollers", async () => {
    const seen: string[] = [];
    const swapSubmit = await submitScroAsyncNode(
      {
        clerkUserId: "worker-user-1",
        canvasIdHex: new ObjectId().toHexString(),
        jobIdHex: "job-swap",
        modelId: "scro:swap",
        node: makeNode("sw1", "scro:swap", { toolParams: { swapMode: "character" } }),
        inputs: emptyInputs({ video: "https://blob.example/src.mp4" }),
      },
      {
        startSwapForUser: async (uid) => {
          seen.push(`swap:${uid}`);
          return { ok: true, job: { id: "jutsu-1" } as never };
        },
      },
    );
    assert.deepEqual(swapSubmit, { domainKind: "jutsu", externalJobId: "jutsu-1" });

    const tpSubmit = await submitScroAsyncNode(
      {
        clerkUserId: "worker-user-2",
        canvasIdHex: new ObjectId().toHexString(),
        jobIdHex: "job-tp",
        modelId: "scro:teleport",
        node: makeNode("tp1", "scro:teleport"),
        inputs: emptyInputs({ video: "https://blob.example/src.mp4" }),
      },
      {
        startTeleportForUser: async (uid) => {
          seen.push(`tp:${uid}`);
          return { ok: true, job: { id: "tp-1" } as never };
        },
      },
    );
    assert.deepEqual(tpSubmit, { domainKind: "teleport", externalJobId: "tp-1" });

    await pollScroAsyncJob(
      { clerkUserId: "worker-user-1", domainKind: "jutsu", externalJobId: "jutsu-1" },
      {
        pollJutsu: async (uid) => {
          seen.push(`poll-jutsu:${uid}`);
          return { ok: true, job: { id: "jutsu-1", status: "rendering" } as never };
        },
      },
    );
    await pollScroAsyncJob(
      { clerkUserId: "worker-user-2", domainKind: "teleport", externalJobId: "tp-1" },
      {
        pollTeleport: async (uid) => {
          seen.push(`poll-tp:${uid}`);
          return { ok: true, job: { id: "tp-1", status: "rendering" } as never };
        },
      },
    );

    assert.deepEqual(seen, [
      "swap:worker-user-1",
      "tp:worker-user-2",
      "poll-jutsu:worker-user-1",
      "poll-tp:worker-user-2",
    ]);
  });

  it("rejects scro:life when characterId does not resolve to an owned blueprint", async () => {
    await assert.rejects(
      () =>
        executeScroSyncNode(
          {
            clerkUserId: "user-1",
            jobIdHex: "job-missing-char",
            modelId: "scro:life",
            node: makeNode("life-bad", "scro:life", {
              toolParams: { characterId: "non-existent" },
            }),
            inputs: emptyInputs({ prompt: "Cafe" }),
          },
          {
            loadCharacterBlueprintUrl: async () => undefined,
            submitImage: async () => {
              throw new Error("submitImage must not be called");
            },
          },
        ),
      /找不到指定角色/,
    );
  });
});
