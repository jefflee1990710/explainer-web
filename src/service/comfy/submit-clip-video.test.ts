import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildOneTakeChainShots,
  shouldUseComfyForClipVideo,
  submitComfyStoryboardClipVideo,
} from "@/service/comfy/submit-clip-video";

test("shouldUseComfyForClipVideo enables ComfyUI ref2va for one-take-director whenever Comfy endpoint is configured", () => {
  const prevBase = process.env.COMFY_BASE_URL;
  const prevKey = process.env.COMFY_API_KEY;
  const prevFlag = process.env.COMFY_CLIP_VIDEO_ENABLED;
  try {
    process.env.COMFY_BASE_URL = "https://comfy.example.com";
    process.env.COMFY_API_KEY = "secret-token";
    delete process.env.COMFY_CLIP_VIDEO_ENABLED;

    assert.equal(
      shouldUseComfyForClipVideo({
        model: "minimax/hailuo-3",
        skillSlug: "one-take-director",
        durationSeconds: 30,
      }),
      true,
    );
    assert.equal(
      shouldUseComfyForClipVideo({
        model: "minimax/hailuo-3",
        skillSlug: "product-demo-director",
        durationSeconds: 8,
      }),
      false,
    );
  } finally {
    if (prevBase === undefined) delete process.env.COMFY_BASE_URL;
    else process.env.COMFY_BASE_URL = prevBase;
    if (prevKey === undefined) delete process.env.COMFY_API_KEY;
    else process.env.COMFY_API_KEY = prevKey;
    if (prevFlag === undefined) delete process.env.COMFY_CLIP_VIDEO_ENABLED;
    else process.env.COMFY_CLIP_VIDEO_ENABLED = prevFlag;
  }
});

test("buildOneTakeChainShots returns 1 shot for <=10s and chains 192-frame (6.375s net) shots up to 60s", () => {
  const single = buildOneTakeChainShots({
    prompt: "0–6s sprints down the mountain trail.",
    durationSeconds: 6,
    hasEndFrame: false,
  });
  assert.equal(single.length, 1);

  const three = buildOneTakeChainShots({
    prompt:
      "0–6s sprints down the dirt ridge; 6–12s leaps across a rocky gap; 12–18s slides around the pine bend.",
    durationSeconds: 18,
    hasEndFrame: false,
  });
  assert.equal(three.length, 3);
  assert.equal(three[0]?.id, "clip_01");
  assert.equal(three[0]?.length, 192);
  assert.match(three[0]?.prompt ?? "", /sprints down the dirt ridge/);
  assert.match(three[1]?.prompt ?? "", /leaps across a rocky gap/);
  assert.match(three[2]?.prompt ?? "", /slides around the pine bend/);

  const fullMinute = buildOneTakeChainShots({
    prompt: "Continuous downhill run across alpine terrain.",
    durationSeconds: 60,
    hasEndFrame: false,
  });
  assert.equal(fullMinute.length, 10);
  assert.ok(fullMinute.every((s) => s.length === 192));
});

test("submitComfyStoryboardClipVideo sets Hard picture + smooth audio and multi-shot plan_json for one-take-director > 10s", async () => {
  const prevBase = process.env.COMFY_BASE_URL;
  const prevKey = process.env.COMFY_API_KEY;
  process.env.COMFY_BASE_URL = "https://comfy.example.com";
  process.env.COMFY_API_KEY = "secret-token";

  let submittedGraph: Record<string, { inputs: Record<string, unknown> }> | undefined;

  const fakeFetch: typeof fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url === "https://blob.example.com/start.jpg") {
      return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
    }
    if (url.endsWith("/upload/image")) {
      return Response.json({ name: "uploaded-start.jpg" });
    }
    if (url.endsWith("/prompt")) {
      const parsed = JSON.parse(String(init?.body)) as {
        prompt: Record<string, { inputs: Record<string, unknown> }>;
      };
      submittedGraph = parsed.prompt;
      return Response.json({ prompt_id: "prompt-123" });
    }
    throw new Error(`unexpected URL ${url}`);
  };

  try {
    const res = await submitComfyStoryboardClipVideo(
      {
        skillSlug: "one-take-director",
        prompt:
          "0–6s starts sprinting downhill; 6–12s dodges boulders; 12–18s jumps fallen log; 18–24s speeds through meadow; 24–30s reaches valley floor.",
        aspectRatio: "9:16",
        durationSeconds: 30,
        startImageUrl: "https://blob.example.com/start.jpg",
      },
      { fetch: fakeFetch },
    );
    assert.equal(res.request_id, "prompt-123");
    assert.equal(res.status_url, "comfy://prompt/prompt-123");
    assert.ok(submittedGraph);
    assert.equal(
      submittedGraph["25"]?.inputs.scene_continuity,
      "Hard picture + smooth audio",
    );
    const plan = JSON.parse(String(submittedGraph["26"]?.inputs.plan_json)) as {
      shots: Array<{ id: string; prompt: string; length: number }>;
    };
    assert.equal(plan.shots.length, 5);
    assert.match(plan.shots[0]?.prompt ?? "", /starts sprinting downhill/);
    assert.match(plan.shots[4]?.prompt ?? "", /reaches valley floor/);
  } finally {
    if (prevBase === undefined) delete process.env.COMFY_BASE_URL;
    else process.env.COMFY_BASE_URL = prevBase;
    if (prevKey === undefined) delete process.env.COMFY_API_KEY;
    else process.env.COMFY_API_KEY = prevKey;
  }
});
