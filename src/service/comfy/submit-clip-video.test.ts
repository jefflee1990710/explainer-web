import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildComfyRef2VaLatentGuideGraph,
  buildOneTakeChainShots,
  shouldUseComfyForClipVideo,
  submitComfyStoryboardClipVideo,
} from "@/service/comfy/submit-clip-video";
import { submitClipVideo } from "@/service/higgsfield/generate";

test("buildComfyRef2VaLatentGuideGraph connects ref_videos and ref_video_audios when videoName and audioName are provided", () => {
  const graph = buildComfyRef2VaLatentGuideGraph({
    runId: "test_run",
    aspectRatio: "9:16",
    durationSeconds: 6,
    prompt: "Camera moves through street",
    startName: "start.jpg",
    videoName: "motion.mp4",
    audioName: "speech.mp3",
  });

  assert.equal(graph["5"]?.class_type, "VHS_LoadVideo");
  assert.equal(graph["5"]?.inputs?.video, "motion.mp4");
  assert.deepEqual(graph["30"]?.inputs?.["ref_videos.ref_video_0"], ["32", 0]);

  assert.equal(graph["74"]?.class_type, "VHS_LoadAudio");
  assert.equal(graph["74"]?.inputs?.audio, "speech.mp3");
  assert.deepEqual(graph["30"]?.inputs?.["ref_video_audios.ref_video_audio_0"], ["74", 0]);
});

test("buildComfyRef2VaLatentGuideGraph removes video and audio loader nodes when videoName and audioName are omitted", () => {
  const graph = buildComfyRef2VaLatentGuideGraph({
    runId: "test_run_empty",
    aspectRatio: "9:16",
    durationSeconds: 6,
    prompt: "Camera moves through street",
    startName: "start.jpg",
  });

  assert.equal(graph["5"], undefined);
  assert.equal(graph["30"]?.inputs?.["ref_videos.ref_video_0"], undefined);
  assert.equal(graph["30"]?.inputs?.["ref_video_audios.ref_video_audio_0"], undefined);
});

test("submitClipVideo never falls back to cloud OpenRouter for non-talking-head clips when Vast serverless is not configured", async () => {
  const prevVast = process.env.VAST_API_KEY;
  try {
    delete process.env.VAST_API_KEY;

    await assert.rejects(
      () =>
        submitClipVideo({
          prompt: "Whiteboard marker draws a flowchart.",
          aspectRatio: "16:9",
          durationSeconds: 6,
          startImageUrl: "https://blob.example.com/start.jpg",
          skillSlug: "cartoon-explainer-video-director",
          styleId: "doodle",
        }),
      /Vast serverless 尚未設定/,
    );
  } finally {
    if (prevVast === undefined) delete process.env.VAST_API_KEY;
    else process.env.VAST_API_KEY = prevVast;
  }
});

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
      true,
    );
    assert.equal(
      shouldUseComfyForClipVideo({
        model: "alibaba/wan-3.0",
        skillSlug: "cartoon-explainer-video-director",
        durationSeconds: 8,
      }),
      true,
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

function serverlessFetch(
  onWorkflow: (graph: Record<string, { inputs: Record<string, unknown>; class_type?: string }>) => void,
): typeof fetch {
  return async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (url === "https://run.vast.ai/route/") {
      return Response.json({
        url: "https://worker.example/h3",
        endpoint: "scro-h3-comfy-serverless",
        cost: 400,
        reqnum: 7,
        request_idx: 1,
        signature: "signed",
        __request_id: "route-1",
      });
    }
    if (url === "https://worker.example/h3/generate/sync") {
      const parsed = JSON.parse(String(init?.body)) as {
        payload: { input: { workflow_json: Record<string, { inputs: Record<string, unknown>; class_type?: string }> } };
      };
      onWorkflow(parsed.payload.input.workflow_json);
      return Response.json({
        id: "prompt-123",
        status: "completed",
        output: [{ url: "https://cdn.example/clip.mp4", filename: "clip.mp4" }],
      });
    }
    throw new Error(`unexpected URL ${url}`);
  };
}

test("submitComfyStoryboardClipVideo sets Hard picture + smooth audio and multi-shot plan_json for one-take-director > 10s", async () => {
  const prevVast = process.env.VAST_API_KEY;
  process.env.VAST_API_KEY = "vast-test";

  let submittedGraph: Record<string, { inputs: Record<string, unknown> }> | undefined;

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
      { fetch: serverlessFetch((graph) => {
        submittedGraph = graph;
      }) },
    );
    assert.equal(res.request_id, "prompt-123");
    assert.equal(res.status, "completed");
    assert.equal(res.video?.url, "https://cdn.example/clip.mp4");
    assert.equal(res.status_url, "comfy://serverless/prompt-123");
    assert.ok(submittedGraph);
    assert.equal(submittedGraph["2"]?.inputs.image, "https://blob.example.com/start.jpg");
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
    if (prevVast === undefined) delete process.env.VAST_API_KEY;
    else process.env.VAST_API_KEY = prevVast;
  }
});

test("submitComfyStoryboardClipVideo sends reference video and audio URLs to Vast serverless", async () => {
  const prevVast = process.env.VAST_API_KEY;
  process.env.VAST_API_KEY = "vast-test";

  let submittedGraph: Record<string, { inputs: Record<string, unknown>; class_type?: string }> | undefined;

  try {
    const res = await submitComfyStoryboardClipVideo(
      {
        prompt: "A runner sprinting in the park",
        aspectRatio: "9:16",
        durationSeconds: 6,
        startImageUrl: "https://blob.example.com/start.jpg",
        referenceVideoUrl: "https://blob.example.com/motion.mp4",
        referenceAudioUrl: "https://blob.example.com/speech.mp3",
      },
      {
        fetch: serverlessFetch((graph) => {
          submittedGraph = graph;
        }),
      },
    );

    assert.equal(res.status, "completed");
    assert.ok(submittedGraph);
    assert.equal(submittedGraph["2"]?.inputs.image, "https://blob.example.com/start.jpg");
    assert.equal(submittedGraph["5"]?.class_type, "VHS_LoadVideo");
    assert.equal(submittedGraph["5"]?.inputs?.video, "https://blob.example.com/motion.mp4");
    assert.deepEqual(submittedGraph["30"]?.inputs?.["ref_videos.ref_video_0"], ["32", 0]);
    assert.equal(submittedGraph["74"]?.class_type, "VHS_LoadAudio");
    assert.equal(submittedGraph["74"]?.inputs?.audio, "https://blob.example.com/speech.mp3");
    assert.deepEqual(submittedGraph["30"]?.inputs?.["ref_video_audios.ref_video_audio_0"], ["74", 0]);
  } finally {
    if (prevVast === undefined) delete process.env.VAST_API_KEY;
    else process.env.VAST_API_KEY = prevVast;
  }
});
