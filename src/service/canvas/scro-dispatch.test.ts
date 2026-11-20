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
});
