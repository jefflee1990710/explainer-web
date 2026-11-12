import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildComfyRef2VaLatentGuideGraph,
  buildOneTakeChainShots,
  shouldUseComfyForClipVideo,
  submitComfyStoryboardClipVideo,
} from "@/service/comfy/submit-clip-video";
import { simpleRef2VaReferences } from "@/service/comfy/simple-ref2va";
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

test("submitClipVideo sends non-talking-head clips to OpenRouter minimax/hailuo-3", async () => {
  const prevKey = process.env.OPENROUTER_API_KEY;
  process.env.OPENROUTER_API_KEY = "sk-or-test";
  let posted: Record<string, unknown> | undefined;
  const fakeFetch: typeof fetch = async (_input, init) => {
    posted = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(
      JSON.stringify({
        id: "vid-hailuo-story",
        polling_url: "/api/v1/videos/vid-hailuo-story",
        status: "pending",
      }),
      { status: 202, headers: { "content-type": "application/json" } },
    );
  };
  try {
    const submitted = await submitClipVideo(
      {
        prompt: "Whiteboard marker draws a flowchart.",
        aspectRatio: "16:9",
        durationSeconds: 6,
        startImageUrl: "https://blob.example.com/start.jpg",
        skillSlug: "cartoon-explainer-video-director",
        styleId: "doodle",
      },
      { fetch: fakeFetch },
    );
    assert.equal(posted?.model, "minimax/hailuo-3");
    assert.equal(submitted.request_id, "vid-hailuo-story");
    assert.match(submitted.status_url ?? "", /vid-hailuo-story/);
  } finally {
    if (prevKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = prevKey;
  }
});

test("shouldUseComfyForClipVideo keeps storyboard clips off the Vast GPU", () => {
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
      false,
    );
    assert.equal(
      shouldUseComfyForClipVideo({
        model: "minimax/hailuo-3",
        skillSlug: "product-demo-director",
        durationSeconds: 8,
      }),
      false,
    );
    assert.equal(
      shouldUseComfyForClipVideo({
        model: "alibaba/wan-3.0",
        skillSlug: "cartoon-explainer-video-director",
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

test("submitComfyStoryboardClipVideo fetches, uploads, and wires reference video and audio when URLs provided", async () => {
  const prevBase = process.env.COMFY_BASE_URL;
  const prevKey = process.env.COMFY_API_KEY;
  process.env.COMFY_BASE_URL = "https://comfy.example.com";
  process.env.COMFY_API_KEY = "secret-token";

  let submittedGraph: Record<string, { inputs: Record<string, unknown>; class_type?: string }> | undefined;
  const uploadedFiles: string[] = [];

  const fakeFetch: typeof fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url === "https://blob.example.com/start.jpg") {
      return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
    }
    if (url === "https://blob.example.com/motion.mp4") {
      return new Response(new Uint8Array([4, 5, 6]), { status: 200 });
    }
    if (url === "https://blob.example.com/speech.mp3") {
      return new Response(new Uint8Array([7, 8, 9]), { status: 200 });
    }
    if (url.endsWith("/upload/image")) {
      const formData = init?.body as FormData;
      const file = formData.get("image") as File;
      const name = file?.name || "unknown";
      uploadedFiles.push(name);
      return Response.json({ name });
    }
    if (url.endsWith("/prompt")) {
      const parsed = JSON.parse(String(init?.body)) as {
        prompt: Record<string, { inputs: Record<string, unknown>; class_type?: string }>;
      };
      submittedGraph = parsed.prompt;
      return Response.json({ prompt_id: "prompt-456" });
    }
    throw new Error(`unexpected URL ${url}`);
  };

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
      { fetch: fakeFetch },
    );

    assert.equal(res.request_id, "prompt-456");
    assert.ok(submittedGraph);

    // Verify video loader and scaling node
    assert.equal(submittedGraph["5"]?.class_type, "VHS_LoadVideo");
    assert.match(String(submittedGraph["5"]?.inputs?.video), /clip-ref-video-.*\.mp4/);
    assert.deepEqual(submittedGraph["30"]?.inputs?.["ref_videos.ref_video_0"], ["32", 0]);

    // Verify audio loader node
    assert.equal(submittedGraph["74"]?.class_type, "VHS_LoadAudio");
    assert.match(String(submittedGraph["74"]?.inputs?.audio), /clip-ref-audio-.*\.mp3/);
    assert.deepEqual(submittedGraph["30"]?.inputs?.["ref_video_audios.ref_video_audio_0"], ["74", 0]);

    // Verify uploaded files include start, video, audio
    assert.ok(uploadedFiles.some((f) => f.includes("clip-start-")));
    assert.ok(uploadedFiles.some((f) => f.includes("clip-ref-video-")));
    assert.ok(uploadedFiles.some((f) => f.includes("clip-ref-audio-")));
  } finally {
    if (prevBase === undefined) delete process.env.COMFY_BASE_URL;
    else process.env.COMFY_BASE_URL = prevBase;
    if (prevKey === undefined) delete process.env.COMFY_API_KEY;
    else process.env.COMFY_API_KEY = prevKey;
  }
});

test("shouldUseComfyForClipVideo routes story and simple videos onto Vast ref2va", () => {
  assert.equal(
    shouldUseComfyForClipVideo({
      model: "minimax/hailuo-3",
      skillSlug: "story-short-director",
    }),
    true,
  );
  assert.equal(
    shouldUseComfyForClipVideo({
      model: "minimax/hailuo-3",
      skillSlug: "story-short-director",
      videoEngine: "comfy-ref2va",
    }),
    true,
  );
  assert.equal(
    shouldUseComfyForClipVideo({
      model: "minimax/hailuo-3",
      hookStrategy: "Direct simple video clip",
    }),
    true,
  );
});

test("simpleRef2VaReferences keeps character and scene stills apart from the start and end guides", () => {
  const stills = simpleRef2VaReferences({
    startImageUrl: "https://blob.example.com/start.jpg",
    endImageUrl: "https://blob.example.com/end.jpg",
    characterImageUrls: [
      "https://blob.example.com/start.jpg",
      "https://blob.example.com/hero.jpg",
    ],
    referenceImages: [
      { url: "https://blob.example.com/hero.jpg", description: "same person" },
      { url: "https://blob.example.com/alley.jpg", description: "neon alley" },
      { url: "http://insecure.example/nope.jpg", description: "dropped" },
    ],
  });
  assert.deepEqual(
    stills.map((item) => item.url),
    ["https://blob.example.com/hero.jpg", "https://blob.example.com/alley.jpg"],
  );
  assert.match(stills[0]?.note ?? "", /character identity/);
  assert.match(stills[1]?.note ?? "", /neon alley/);
});

test("simple ref2va graph wires the end frame and extra stills as later pictures", () => {
  const graph = buildComfyRef2VaLatentGuideGraph({
    runId: "simple1",
    aspectRatio: "9:16",
    durationSeconds: 6,
    prompt: "She turns toward the window.",
    startName: "start.jpg",
    endName: "end.jpg",
    extraRefNames: ["char.jpg", "room.jpg"],
    extraReferenceNotes: [
      "the character identity and wardrobe reference",
      "a scene or subject reference (neon alley)",
    ],
    skillSlug: "story-short-director",
  });
  assert.equal(graph["3"]?.inputs?.image, "end.jpg");
  assert.equal(graph["80"]?.inputs?.image, "char.jpg");
  assert.equal(graph["81"]?.inputs?.image, "room.jpg");
  assert.deepEqual(graph["30"]?.inputs?.["ref_images.ref_image_0"], ["2", 0]);
  assert.deepEqual(graph["30"]?.inputs?.["ref_images.ref_image_1"], ["3", 0]);
  assert.deepEqual(graph["30"]?.inputs?.["ref_images.ref_image_2"], ["80", 0]);
  assert.deepEqual(graph["30"]?.inputs?.["ref_images.ref_image_3"], ["81", 0]);
  assert.equal(graph["73"]?.inputs?.frame_idx, -1);
  const plan = JSON.parse(String(graph["26"]?.inputs?.plan_json)) as {
    shots: Array<{ prompt: string }>;
  };
  assert.equal(plan.shots.length, 1);
  assert.match(plan.shots[0]?.prompt ?? "", /<Picture 3> is the character identity/);
  assert.match(plan.shots[0]?.prompt ?? "", /neon alley/);
});

test("story ref2va pins the same still as first and last frame and keeps the reference image and audio", async () => {
  const prevBase = process.env.COMFY_BASE_URL;
  const prevKey = process.env.COMFY_API_KEY;
  process.env.COMFY_BASE_URL = "https://comfy.example.com";
  process.env.COMFY_API_KEY = "secret-token";

  let submittedGraph: Record<string, { inputs: Record<string, unknown>; class_type?: string }> | undefined;
  const uploadedFiles: string[] = [];
  const fakeFetch: typeof fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url === "https://blob.example.com/latest.jpg" || url === "https://blob.example.com/hero.jpg" || url === "https://blob.example.com/line.mp3") {
      return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
    }
    if (url.endsWith("/upload/image")) {
      const formData = init?.body as FormData;
      const file = formData.get("image") as File;
      const name = file?.name || "unknown";
      uploadedFiles.push(name);
      return Response.json({ name });
    }
    if (url.endsWith("/prompt")) {
      const parsed = JSON.parse(String(init?.body)) as {
        prompt: Record<string, { inputs: Record<string, unknown>; class_type?: string }>;
      };
      submittedGraph = parsed.prompt;
      return Response.json({ prompt_id: "prompt-story" });
    }
    throw new Error(`unexpected URL ${url}`);
  };

  try {
    const res = await submitComfyStoryboardClipVideo(
      {
        prompt: "She answers across the table.",
        aspectRatio: "9:16",
        durationSeconds: 6,
        startImageUrl: "https://blob.example.com/latest.jpg",
        endImageUrl: "https://blob.example.com/latest.jpg",
        pinSameFrameAsLast: true,
        characterImageUrl: "https://blob.example.com/hero.jpg",
        referenceAudioUrl: "https://blob.example.com/line.mp3",
        skillSlug: "story-short-director",
      },
      { fetch: fakeFetch },
    );
    assert.equal(res.request_id, "prompt-story");
    assert.ok(uploadedFiles.some((name) => name.startsWith("clip-start-")));
    assert.ok(uploadedFiles.some((name) => name.startsWith("clip-end-")));
    assert.ok(uploadedFiles.some((name) => name.startsWith("clip-char-")));
    assert.ok(uploadedFiles.some((name) => name.startsWith("clip-ref-audio-")));
    assert.equal(submittedGraph?.["73"]?.inputs?.frame_idx, -1);
    assert.equal(submittedGraph?.["74"]?.class_type, "VHS_LoadAudio");
    assert.equal(submittedGraph?.["70"]?.class_type, "LoadImage");
    const plan = JSON.parse(String(submittedGraph?.["26"]?.inputs?.plan_json)) as {
      shots: Array<{ prompt: string }>;
    };
    assert.match(plan.shots[0]?.prompt ?? "", /closing keyframe/);
    assert.match(plan.shots[0]?.prompt ?? "", /Character Identity/);
  } finally {
    if (prevBase === undefined) delete process.env.COMFY_BASE_URL;
    else process.env.COMFY_BASE_URL = prevBase;
    if (prevKey === undefined) delete process.env.COMFY_API_KEY;
    else process.env.COMFY_API_KEY = prevKey;
  }
});
