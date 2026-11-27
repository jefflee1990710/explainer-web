import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ObjectId } from "mongodb";
import type { CanvasNode } from "@/model/canvas";
import type { ResolvedCanvasInputs } from "@/service/canvas/core/graph";
import { findCanvasModel } from "@/service/canvas/catalog/model-catalog";
import {
  executeScroSyncNode,
  pollScroAsyncJob,
  resolveAutoVideoClipNumbers,
  shouldSkipProjectBilling,
  submitScroAsyncNode,
  validateScroToolInputs,
} from "@/service/canvas/execution/scro-dispatch";
import { OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL } from "@/service/openrouter/generate";

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

  it("rejects an empty character blueprint and accepts one photo", () => {
    const empty = validateScroToolInputs(
      "scro:character",
      makeNode("char-empty", "scro:character"),
      emptyInputs(),
    );
    assert.equal(empty.ok, false);
    const ready = validateScroToolInputs(
      "scro:character",
      makeNode("char-ready", "scro:character", { prompt: "short hair" }),
      emptyInputs({ refImages: ["https://blob.example/face.png"] }),
    );
    assert.deepEqual(ready, { ok: true });
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

  it("uses conversational ElevenLabs delivery when ttsConversational is set", async () => {
    const calls: unknown[] = [];
    await executeScroSyncNode(
      {
        clerkUserId: "user-1",
        jobIdHex: "job-conv",
        modelId: "scro:tts",
        node: makeNode("tts2", "scro:tts", {
          toolParams: { language: "en", voicePreset: "brian", ttsConversational: true },
        }),
        inputs: emptyInputs({ prompt: "Hi there" }),
      },
      {
        synthesizeSpeech: async () => {
          throw new Error("narration path should not run");
        },
        synthesizeConversational: async (_voice, _text, options) => {
          calls.push(options);
          return Buffer.from("mp3");
        },
        persistAudioBuffer: async () => "https://blob.example/a.mp3",
      },
    );
    assert.deepEqual(calls, [{ conversational: true, language: "en" }]);
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

  it("runs scro:character through Seedream 5.0 Pro", async () => {
    assert.equal(
      findCanvasModel("scro:character")?.providerModelId,
      OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL,
    );
    let seen: { model?: string; prompt?: string; aspectRatio?: string; resolution?: string; refs?: string[] } =
      {};
    const out = await executeScroSyncNode(
      {
        clerkUserId: "user-1",
        jobIdHex: "job-char",
        modelId: "scro:character",
        node: makeNode("char-1", "scro:character", { label: "Mia", prompt: "warm smile" }),
        inputs: emptyInputs({
          prompt: "warm smile",
          refImages: ["https://blob.example/face.png", "https://blob.example/face-2.png"],
          outfitRefs: [
            {
              handle: "top",
              url: "https://blob.example/jacket.png",
              name: "Navy blazer",
              prompt: "a navy wool blazer",
            },
          ],
        }),
      },
      {
        submitImage: async (input) => {
          seen = {
            model: input.model,
            prompt: input.prompt,
            aspectRatio: input.aspectRatio,
            resolution: input.resolution,
            refs: (input.referenceImageUrls ?? []).filter((url): url is string => Boolean(url)),
          };
          return {
            request_id: "req-char",
            status: "completed",
            images: [{ url: "https://blob.example/raw.png" }],
          };
        },
        persistImageUrl: async () => "https://blob.example/canvas/user-1/job-char.png",
      },
    );
    assert.equal(seen.model, OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL);
    assert.equal(seen.aspectRatio, "1:1");
    assert.equal(seen.resolution, "2k");
    assert.match(seen.prompt ?? "", /navy wool blazer/);
    assert.match(seen.prompt ?? "", /Mia/);
    assert.deepEqual(seen.refs, [
      "https://blob.example/face.png",
      "https://blob.example/face-2.png",
      "https://blob.example/jacket.png",
    ]);
    assert.equal(out.outputKind, "image");
    assert.equal(out.outputUrl, "https://blob.example/canvas/user-1/job-char.png");
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

  it("runs swap-render on the whole input without the final grade", async () => {
    let seen: Record<string, unknown> | undefined;
    const out = await submitScroAsyncNode(
      {
        clerkUserId: "u1",
        canvasIdHex: new ObjectId().toHexString(),
        jobIdHex: "job-sr",
        modelId: "scro:swap-render",
        node: makeNode("sr1", "scro:swap-render", {
          durationSeconds: 9,
          toolParams: { swapMode: "object", objectTarget: "jacket" },
        }),
        inputs: emptyInputs({ video: "https://blob.example/trim.mp4", prompt: "red jacket" }),
      },
      {
        startSwapForUser: async (_uid, input) => {
          seen = input as unknown as Record<string, unknown>;
          return { ok: true, job: { id: "jutsu-2" } as never };
        },
      },
    );
    assert.deepEqual(out, { domainKind: "jutsu", externalJobId: "jutsu-2" });
    assert.equal(seen?.mode, "object_swap");
    assert.equal(seen?.sectionStart, 0);
    assert.equal(seen?.sectionLength, 9);
    assert.equal(seen?.applyColorFix, false);
    assert.equal(seen?.objectChangeTo, "red jacket");
  });

  it("routes scro:director-frame through the explainer frame submit", async () => {
    await assert.rejects(
      submitScroAsyncNode({
        clerkUserId: "u1",
        canvasIdHex: new ObjectId().toHexString(),
        jobIdHex: "job-df",
        modelId: "scro:director-frame",
        node: makeNode("df1", "scro:director-frame"),
        inputs: emptyInputs({ prompt: "opening still" }),
      }),
      /缺少規劃資料/,
    );
  });

  it("runs teleport-render with the wired scene and no final grade", async () => {
    let seen: Record<string, unknown> | undefined;
    const base = {
      clerkUserId: "u1",
      canvasIdHex: new ObjectId().toHexString(),
      jobIdHex: "job-tr",
      modelId: "scro:teleport-render",
      node: makeNode("tr1", "scro:teleport-render", { durationSeconds: 5, aspectRatio: "9:16" }),
    };
    const deps = {
      startTeleportForUser: async (_uid: string, input: unknown) => {
        seen = input as Record<string, unknown>;
        return { ok: true as const, job: { id: "tp-2" } as never };
      },
    };
    await assert.rejects(
      submitScroAsyncNode({ ...base, inputs: emptyInputs({ video: "https://blob.example/v.mp4" }) }, deps),
      /場景/,
    );
    const out = await submitScroAsyncNode(
      {
        ...base,
        inputs: emptyInputs({
          video: "https://blob.example/v.mp4",
          image: "https://blob.example/scene.png",
          prompt: "golden hour",
        }),
      },
      deps,
    );
    assert.deepEqual(out, { domainKind: "teleport", externalJobId: "tp-2" });
    assert.equal(seen?.sceneImageUrl, "https://blob.example/scene.png");
    assert.equal(seen?.scenePrompt, "golden hour");
    assert.equal(seen?.sectionLength, 5);
    assert.equal(seen?.applyColorFix, false);
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
