import assert from "node:assert/strict";
import { test } from "node:test";
import {
  fetchOpenRouterStatus,
  HEYGEN_AVATAR_6_DEFAULT_PROMPT,
  HEYGEN_AVATAR_IV_MOTION_PROMPT,
  heyGenAvatarIvMotionPrompt,
  isOpenRouterHeyGenAvatarModel,
  isOpenRouterStatusUrl,
  OPENROUTER_HEYGEN_AVATAR_6_TURBO_VIDEO_MODEL,
  OPENROUTER_HEYGEN_AVATAR_6_VIDEO_MODEL,
  OPENROUTER_HEYGEN_AVATAR_IV_VIDEO_MODEL,
  OPENROUTER_HEYGEN_VIDEO_1_MODEL,
  openRouterCanvasVideoBody,
  openRouterClipVideoBody,
  openRouterHeyGenAudioVideoBody,
  openRouterImageAspectRatio,
  openRouterImageBody,
  submitOpenRouterCanvasVideo,
  submitOpenRouterClipVideo,
  submitOpenRouterImage,
} from "@/service/openrouter/generate";
import { submitClipVideo } from "@/service/higgsfield/generate";

test("isOpenRouterStatusUrl detects OpenRouter video polling and content URLs", () => {
  assert.equal(
    isOpenRouterStatusUrl("https://openrouter.ai/api/v1/videos/job-123"),
    true,
  );
  assert.equal(
    isOpenRouterStatusUrl("https://openrouter.ai/api/v1/videos/job-123/content?index=0"),
    true,
  );
  assert.equal(
    isOpenRouterStatusUrl("https://platform.higgsfield.ai/requests/abc"),
    false,
  );
  assert.equal(
    isOpenRouterStatusUrl("https://dashscope.aliyuncs.com/api/v1/tasks/abc"),
    false,
  );
});

test("openRouterImageAspectRatio maps GPT-5 Image to supported 1:1 / 3:2 / 2:3", () => {
  assert.equal(openRouterImageAspectRatio("openai/gpt-5-image", "16:9"), "3:2");
  assert.equal(openRouterImageAspectRatio("openai/gpt-5-image", "9:16"), "2:3");
  assert.equal(openRouterImageAspectRatio("openai/gpt-5-image", "2:3"), "2:3");
  assert.equal(openRouterImageAspectRatio("openai/gpt-5-image", "1:1"), "1:1");
});

test("openRouterImageBody formats /api/v1/images payload with input_references", () => {
  assert.deepEqual(
    openRouterImageBody({
      model: "bytedance-seed/seedream-5-0-lite",
      prompt: "draw a scene",
      aspectRatio: "9:16",
      resolution: "1k",
      referenceImageUrls: ["https://blob/ref1.png", undefined, "https://blob/ref2.png"],
    }),
    {
      model: "bytedance-seed/seedream-5-0-lite",
      prompt: "draw a scene",
      aspect_ratio: "9:16",
      resolution: "2K",
      input_references: [
        { type: "image_url", image_url: { url: "https://blob/ref1.png" } },
        { type: "image_url", image_url: { url: "https://blob/ref2.png" } },
      ],
    },
  );

  assert.deepEqual(
    openRouterImageBody({
      model: "bytedance-seed/seedream-5-0-pro",
      prompt: "draw a scene",
      aspectRatio: "16:9",
      resolution: "2k",
      referenceImageUrls: ["https://blob/ref.png"],
    }),
    {
      model: "bytedance-seed/seedream-5-0-pro",
      prompt: "draw a scene",
      aspect_ratio: "16:9",
      resolution: "2K",
      input_references: [
        { type: "image_url", image_url: { url: "https://blob/ref.png" } },
      ],
    },
  );

  assert.deepEqual(
    openRouterImageBody({
      model: "bytedance-seed/seedream-5-0-pro",
      prompt: "draw a blueprint",
      aspectRatio: "1:1",
      resolution: "1k",
    }),
    {
      model: "bytedance-seed/seedream-5-0-pro",
      prompt: "draw a blueprint",
      aspect_ratio: "1:1",
      resolution: "1K",
    },
  );

  assert.deepEqual(
    openRouterImageBody({
      model: "google/gemini-nano-banana-2.1",
      prompt: "draw an explainer diagram",
      aspectRatio: "9:16",
      resolution: "1k",
      referenceImageUrls: ["https://blob/start.png"],
    }),
    {
      model: "google/gemini-nano-banana-2.1",
      prompt: "draw an explainer diagram",
      aspect_ratio: "9:16",
      resolution: "1K",
      input_references: [
        { type: "image_url", image_url: { url: "https://blob/start.png" } },
      ],
    },
  );

  assert.deepEqual(
    openRouterImageBody({
      model: "google/gemini-nano-banana-2.1",
      prompt: "draw a 4K explainer diagram",
      aspectRatio: "16:9",
      resolution: "4k",
    }),
    {
      model: "google/gemini-nano-banana-2.1",
      prompt: "draw a 4K explainer diagram",
      aspect_ratio: "16:9",
      resolution: "4K",
    },
  );

  assert.deepEqual(
    openRouterImageBody({
      model: "openai/gpt-5-image",
      prompt: "draw a scene",
      aspectRatio: "16:9",
      quality: "high",
      referenceImageUrls: ["https://blob/ref1.png"],
    }),
    {
      model: "openai/gpt-5-image",
      prompt: "draw a scene",
      aspect_ratio: "3:2",
      quality: "high",
      background: "opaque",
      input_references: [
        { type: "image_url", image_url: { url: "https://blob/ref1.png" } },
      ],
    },
  );
});

test("openRouterImageBody omits parameters a canvas image model does not accept", () => {
  const panorama = openRouterImageBody({
    model: "tencent/hy-world-2.1-panorama",
    prompt: "a red square",
    aspectRatio: "1:1",
    resolution: "1k",
  });
  assert.equal(panorama.model, "tencent/hy-world-2.1-panorama");
  assert.equal("aspect_ratio" in panorama, false);
  assert.equal("resolution" in panorama, false);
});

test("openRouterClipVideoBody formats /api/v1/videos payload for bytedance/seedance-2.0-fast and minimax/hailuo-3", () => {
  assert.deepEqual(
    openRouterClipVideoBody({
      model: "bytedance/seedance-2.0-fast",
      prompt: "camera pans right",
      aspectRatio: "9:16",
      durationSeconds: 3,
      startImageUrl: "https://blob/start.png",
      endImageUrl: "https://blob/end.png",
    }),
    {
      model: "bytedance/seedance-2.0-fast",
      prompt: "camera pans right",
      aspect_ratio: "9:16",
      duration: 5,
      resolution: "720p",
      generate_audio: true,
      frame_images: [
        {
          type: "image_url",
          image_url: { url: "https://blob/start.png" },
          frame_type: "first_frame",
        },
        {
          type: "image_url",
          image_url: { url: "https://blob/end.png" },
          frame_type: "last_frame",
        },
      ],
    },
  );

  assert.deepEqual(
    openRouterClipVideoBody({
      model: "minimax/hailuo-3",
      prompt: "talking head clip",
      aspectRatio: "9:16",
      durationSeconds: 5,
      startImageUrl: "https://blob/start.png",
      endImageUrl: "https://blob/end.png",
    }),
    {
      model: "minimax/hailuo-3",
      prompt: "talking head clip",
      aspect_ratio: "9:16",
      duration: 5,
      resolution: "2K",
      generate_audio: true,
      frame_images: [
        {
          type: "image_url",
          image_url: { url: "https://blob/start.png" },
          frame_type: "first_frame",
        },
        {
          type: "image_url",
          image_url: { url: "https://blob/end.png" },
          frame_type: "last_frame",
        },
      ],
    },
  );

  const prevRes = process.env.VIDEO_GENERATION_RESOLUTION;
  process.env.VIDEO_GENERATION_RESOLUTION = "480p";
  try {
    assert.equal(
      openRouterClipVideoBody({
        model: "bytedance/seedance-2.0-fast",
        prompt: "talking head clip",
        aspectRatio: "9:16",
        durationSeconds: 5,
        startImageUrl: "https://blob/start.png",
      }).resolution,
      "480p",
    );
  } finally {
    if (prevRes === undefined) delete process.env.VIDEO_GENERATION_RESOLUTION;
    else process.env.VIDEO_GENERATION_RESOLUTION = prevRes;
  }

  const startOnly = openRouterClipVideoBody({
    model: "bytedance/seedance-2.0-fast",
    prompt: "camera pans right",
    aspectRatio: "16:9",
    durationSeconds: 6,
    startImageUrl: "https://blob/start.png",
  });
  assert.equal(startOnly.frame_images.length, 1);
  assert.equal(startOnly.frame_images[0]?.frame_type, "first_frame");

  const longPrompt = `HEAD_MARKER ${"a".repeat(5000)} MIDDLE ${"b".repeat(2500)} TAIL_LOCK_MARKER`;
  const capped = openRouterClipVideoBody({
    model: "minimax/hailuo-3",
    prompt: longPrompt,
    aspectRatio: "9:16",
    durationSeconds: 5,
    startImageUrl: "https://blob/start.png",
  });
  assert.ok(capped.prompt.length <= 6800);
  assert.match(capped.prompt, /^HEAD_MARKER/);
  assert.match(capped.prompt, /TAIL_LOCK_MARKER$/);

  const heygenBody = openRouterHeyGenAudioVideoBody({
    model: OPENROUTER_HEYGEN_AVATAR_IV_VIDEO_MODEL,
    prompt: "Speak to camera",
    aspectRatio: "9:16",
    startImageUrl: "https://blob/start.png",
    audioUrl: "https://blob/vo.mp3",
  });
  assert.equal(heygenBody.model, "heygen/avatar-iv");
  assert.equal(heygenBody.resolution, "1080p");
  assert.match(heygenBody.prompt, /EXPRESSIVE, READABLE CONTENT-DRIVEN MICRO-EXPRESSIONS/);
  assert.match(heygenBody.prompt, /20–25%/);
  assert.match(heygenBody.prompt, /cartoon O-mouth/);
  assert.deepEqual(heygenBody.input_references, [
    { type: "image_url", image_url: { url: "https://blob/start.png" } },
    { type: "audio_url", audio_url: { url: "https://blob/vo.mp3" } },
  ]);
});

test("submitOpenRouterImage posts to /api/v1/images and returns completed data URL", async () => {
  const prevKey = process.env.OPENROUTER_API_KEY;
  process.env.OPENROUTER_API_KEY = "sk-or-test";
  let calledUrl = "";
  let calledInit: RequestInit | undefined;
  const fakeFetch: typeof fetch = async (input, init) => {
    calledUrl = String(input);
    calledInit = init;
    return new Response(
      JSON.stringify({
        created: 1748372400,
        data: [{ b64_json: "aGVsbG8=", media_type: "image/png" }],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };

  try {
    const result = await submitOpenRouterImage(
      {
        model: "openai/gpt-5-image",
        prompt: "draw cat",
        aspectRatio: "1:1",
        quality: "medium",
      },
      { fetch: fakeFetch },
    );
    assert.equal(calledUrl, "https://openrouter.ai/api/v1/images");
    assert.equal(calledInit?.method, "POST");
    assert.equal(result.status, "completed");
    assert.deepEqual(result.images, [{ url: "data:image/png;base64,aGVsbG8=" }]);
    assert.ok(result.request_id);
  } finally {
    if (prevKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = prevKey;
  }
});

test("submitOpenRouterClipVideo posts callback_url when one is provided", async () => {
  const prevKey = process.env.OPENROUTER_API_KEY;
  process.env.OPENROUTER_API_KEY = "sk-or-test";
  let posted: Record<string, unknown> | undefined;
  const fakeFetch: typeof fetch = async (_input, init) => {
    posted = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(
      JSON.stringify({ id: "vid-job-2", polling_url: "/api/v1/videos/vid-job-2", status: "pending" }),
      { status: 202, headers: { "content-type": "application/json" } },
    );
  };
  try {
    await submitOpenRouterClipVideo(
      {
        prompt: "walk",
        aspectRatio: "16:9",
        durationSeconds: 5,
        startImageUrl: "https://blob/start.png",
      },
      { fetch: fakeFetch, callbackUrl: "https://explainer.io/api/webhooks/openrouter" },
    );
    assert.equal(posted?.callback_url, "https://explainer.io/api/webhooks/openrouter");
  } finally {
    if (prevKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = prevKey;
  }
});

test("submitOpenRouterClipVideo and fetchOpenRouterStatus handle async video lifecycle", async () => {
  const prevKey = process.env.OPENROUTER_API_KEY;
  process.env.OPENROUTER_API_KEY = "sk-or-test";

  const fakeSubmitFetch: typeof fetch = async () =>
    new Response(
      JSON.stringify({
        id: "vid-job-1",
        polling_url: "/api/v1/videos/vid-job-1",
        status: "pending",
      }),
      { status: 202, headers: { "content-type": "application/json" } },
    );

  const fakePollFetch: typeof fetch = async () =>
    new Response(
      JSON.stringify({
        id: "vid-job-1",
        polling_url: "https://openrouter.ai/api/v1/videos/vid-job-1",
        status: "completed",
        unsigned_urls: ["https://openrouter.ai/api/v1/videos/vid-job-1/content?index=0"],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );

  try {
    const submitted = await submitOpenRouterClipVideo(
      {
        prompt: "walk",
        aspectRatio: "16:9",
        durationSeconds: 5,
        startImageUrl: "https://blob/start.png",
        endImageUrl: "https://blob/end.png",
      },
      { fetch: fakeSubmitFetch, callbackUrl: null },
    );
    assert.equal(submitted.request_id, "vid-job-1");
    assert.equal(submitted.status_url, "https://openrouter.ai/api/v1/videos/vid-job-1");
    assert.equal(submitted.status, "queued");

    const polled = await fetchOpenRouterStatus(submitted.status_url!, {
      fetch: fakePollFetch,
    });
    assert.equal(polled.request_id, "vid-job-1");
    assert.equal(polled.status, "completed");
    assert.deepEqual(polled.video, {
      url: "https://openrouter.ai/api/v1/videos/vid-job-1/content?index=0",
    });
  } finally {
    if (prevKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = prevKey;
  }
});

test("submitOpenRouterClipVideo falls back from Seedance to alibaba/wan-3.0 when ByteDance rejects a frame face as real person", async () => {
  const prevKey = process.env.OPENROUTER_API_KEY;
  process.env.OPENROUTER_API_KEY = "sk-or-test";
  const postedModels: string[] = [];
  const postedResolutions: string[] = [];
  const fakeFetch: typeof fetch = async (_input, init) => {
    const payload = JSON.parse(String(init?.body)) as { model: string; resolution: string };
    postedModels.push(payload.model);
    postedResolutions.push(payload.resolution);
    if (postedModels.length === 1) {
      return new Response(
        JSON.stringify({
          error: {
            message:
              'HTTP 400: {"error":{"code":"InputImageSensitiveContentDetected.PrivacyInformation","message":"The request failed because the input image \'content[1]\' may contain real person."}}',
          },
        }),
        { status: 400, headers: { "content-type": "application/json" } },
      );
    }
    return new Response(
      JSON.stringify({
        id: "vid-wan-fallback",
        polling_url: "/api/v1/videos/vid-wan-fallback",
        status: "pending",
      }),
      { status: 202, headers: { "content-type": "application/json" } },
    );
  };

  try {
    const submitted = await submitOpenRouterClipVideo(
      {
        model: "bytedance/seedance-2.0-fast",
        prompt: "paper cutout clip",
        aspectRatio: "9:16",
        durationSeconds: 11,
        startImageUrl: "https://blob/start.png",
      },
      { fetch: fakeFetch, callbackUrl: null },
    );
    assert.deepEqual(postedModels, ["bytedance/seedance-2.0-fast", "alibaba/wan-3.0"]);
    assert.deepEqual(postedResolutions, ["720p", "480p"]);
    assert.equal(submitted.request_id, "vid-wan-fallback");
    assert.equal(submitted.model, "alibaba/wan-3.0");
  } finally {
    if (prevKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = prevKey;
  }
});

test("submitOpenRouterClipVideo falls back from bytedance/seedance-2.0 to minimax/hailuo-3 (2K) when fallbackModel is minimax/hailuo-3 and ByteDance rejects a frame face", async () => {
  const prevKey = process.env.OPENROUTER_API_KEY;
  process.env.OPENROUTER_API_KEY = "sk-or-test";
  const postedModels: string[] = [];
  const postedResolutions: string[] = [];
  const fakeFetch: typeof fetch = async (_input, init) => {
    const payload = JSON.parse(String(init?.body)) as { model: string; resolution: string };
    postedModels.push(payload.model);
    postedResolutions.push(payload.resolution);
    if (postedModels.length === 1) {
      return new Response(
        JSON.stringify({
          error: {
            message:
              'HTTP 400: {"error":{"code":"InputImageSensitiveContentDetected.PrivacyInformation","message":"The request failed because the input image \'content[1]\' may contain real person."}}',
          },
        }),
        { status: 400, headers: { "content-type": "application/json" } },
      );
    }
    return new Response(
      JSON.stringify({
        id: "vid-hailuo-fallback",
        polling_url: "/api/v1/videos/vid-hailuo-fallback",
        status: "pending",
      }),
      { status: 202, headers: { "content-type": "application/json" } },
    );
  };

  try {
    const submitted = await submitOpenRouterClipVideo(
      {
        model: "bytedance/seedance-2.0",
        fallbackModel: "minimax/hailuo-3",
        prompt: "story short realistic clip",
        aspectRatio: "9:16",
        durationSeconds: 10,
        startImageUrl: "https://blob/start.png",
      },
      { fetch: fakeFetch, callbackUrl: null },
    );
    assert.deepEqual(postedModels, ["bytedance/seedance-2.0", "minimax/hailuo-3"]);
    assert.deepEqual(postedResolutions, ["720p", "2K"]);
    assert.equal(submitted.request_id, "vid-hailuo-fallback");
    assert.equal(submitted.model, "minimax/hailuo-3");
  } finally {
    if (prevKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = prevKey;
  }
});

test("submitClipVideo with audioUrl sends talking-head-director clips (up to 120s) to heygen/avatar-iv without clamping duration to 15s", async () => {
  const prevKey = process.env.OPENROUTER_API_KEY;
  process.env.OPENROUTER_API_KEY = "sk-or-test";
  let postedBody: Record<string, unknown> | undefined;
  const fakeFetch: typeof fetch = async (_input, init) => {
    postedBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(
      JSON.stringify({
        id: "vid-heygen-120s",
        polling_url: "/api/v1/videos/vid-heygen-120s",
        status: "pending",
      }),
      { status: 202, headers: { "content-type": "application/json" } },
    );
  };

  try {
    const submitted = await submitClipVideo(
      {
        prompt: HEYGEN_AVATAR_IV_MOTION_PROMPT,
        aspectRatio: "9:16",
        durationSeconds: 120,
        startImageUrl: "https://blob/start.png",
        audioUrl: "https://blob/vo-120s.mp3",
      },
      { fetch: fakeFetch },
    );
    assert.equal(postedBody?.model, "heygen/avatar-iv");
    assert.equal("duration" in (postedBody || {}), false);
    assert.deepEqual(postedBody?.input_references, [
      { type: "image_url", image_url: { url: "https://blob/start.png" } },
      { type: "audio_url", audio_url: { url: "https://blob/vo-120s.mp3" } },
    ]);
    assert.equal(submitted.request_id, "vid-heygen-120s");
  } finally {
    if (prevKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = prevKey;
  }
});

test("heyGenAvatarIvMotionPrompt and openRouterHeyGenAudioVideoBody pass speaking language and spoken script to heygen/avatar-iv without injecting Cantonese rules into English", () => {
  const enPrompt = heyGenAvatarIvMotionPrompt("collarbone-close", {
    language: "en",
    spokenScript: "If you have ADHD, your brain has an interest-based nervous system.",
  });
  assert.match(enPrompt, /Speaking in English/i);
  assert.match(enPrompt, /If you have ADHD, your brain has an interest-based nervous system\./);
  assert.doesNotMatch(enPrompt, /冇 mou5|諗 nam2/);

  const yuePrompt = heyGenAvatarIvMotionPrompt("collarbone-close", {
    language: "yue",
    spokenScript: "你有冇諗過點解越忙越無安全感？",
  });
  assert.match(yuePrompt, /Hong Kong Cantonese/i);
  assert.match(yuePrompt, /冇 mou5/);
  assert.match(yuePrompt, /你有冇諗過點解越忙越無安全感？/);

  const enBody = openRouterHeyGenAudioVideoBody({
    model: OPENROUTER_HEYGEN_AVATAR_IV_VIDEO_MODEL,
    prompt: "Custom natural talking head prompt.",
    language: "en",
    spokenScript: "If you have ADHD, your brain has an interest-based nervous system.",
    aspectRatio: "16:9",
    startImageUrl: "https://blob/start.jpg",
    audioUrl: "https://blob/vo.mp3",
  });
  assert.match(enBody.prompt, /Custom natural talking head prompt\./);
  assert.match(enBody.prompt, /Speaking in English/i);
  assert.match(enBody.motion_prompt || "", /Speaking in English/i);
  assert.doesNotMatch(enBody.prompt, /冇 mou5/);
  assert.match(enPrompt, /wireless lavalier microphone/i);

  const waistPrompt = heyGenAvatarIvMotionPrompt("waist-up", {
    language: "en",
    spokenScript: "Testing waist-up mic anchor.",
  });
  assert.match(waistPrompt, /wireless lavalier microphone/i);

  const selfiePrompt = heyGenAvatarIvMotionPrompt("handheld-selfie", {
    language: "yue",
    spokenScript: "手拎住手機自拍講嘢。",
  });
  assert.match(selfiePrompt, /occasional slight handheld camera shake/i);
  assert.match(selfiePrompt, /extended selfie arm/i);
});

test("openRouterCanvasVideoBody supports text-only, first/last frames, references, and HeyGen Avatar IV", () => {
  // Pure text-to-video omits frame_images and input_references.
  const t2v = openRouterCanvasVideoBody({
    model: "minimax/hailuo-3",
    prompt: "A neon cyber city in the rain",
    aspectRatio: "16:9",
    durationSeconds: 6,
  });
  assert.equal(t2v.model, "minimax/hailuo-3");
  assert.equal(t2v.resolution, "2K");
  assert.equal(t2v.duration, 6);
  assert.equal("frame_images" in t2v, false);
  assert.equal("input_references" in t2v, false);

  // First/last frame + reference images.
  const framed = openRouterCanvasVideoBody({
    model: "bytedance/seedance-2.0",
    prompt: "Smooth camera push in",
    aspectRatio: "9:16",
    durationSeconds: 8,
    startImageUrl: "https://blob/start.png",
    endImageUrl: "https://blob/end.png",
    referenceImageUrls: ["https://blob/ref1.png", undefined, "https://blob/ref2.png"],
  });
  assert.deepEqual(framed.frame_images, [
    { type: "image_url", image_url: { url: "https://blob/start.png" }, frame_type: "first_frame" },
    { type: "image_url", image_url: { url: "https://blob/end.png" }, frame_type: "last_frame" },
  ]);
  assert.deepEqual(framed.input_references, [
    { type: "image_url", image_url: { url: "https://blob/ref1.png" } },
    { type: "image_url", image_url: { url: "https://blob/ref2.png" } },
  ]);

  // HeyGen Avatar IV delegates to openRouterHeyGenAudioVideoBody.
  const heygen = openRouterCanvasVideoBody({
    model: OPENROUTER_HEYGEN_AVATAR_IV_VIDEO_MODEL,
    prompt: "Warm confident delivery",
    aspectRatio: "9:16",
    startImageUrl: "https://blob/avatar.png",
    audioUrl: "https://blob/speech.mp3",
  });
  assert.equal(heygen.model, OPENROUTER_HEYGEN_AVATAR_IV_VIDEO_MODEL);
  assert.equal("duration" in heygen, false);
  assert.deepEqual(heygen.input_references, [
    { type: "image_url", image_url: { url: "https://blob/avatar.png" } },
    { type: "audio_url", audio_url: { url: "https://blob/speech.mp3" } },
  ]);
  assert.equal(heygen.motion_prompt, "Warm confident delivery");

  // Gen-4.5 only lists 16:9 and 9:16. Hailuo 2.3 only accepts 1080p and 6s or 10s.
  const gen45 = openRouterCanvasVideoBody({
    model: "runway/gen-4.5",
    prompt: "A quiet street at dusk",
    aspectRatio: "1:1",
    durationSeconds: 5,
  });
  assert.equal(gen45.duration, 5);
  assert.equal(gen45.aspect_ratio, "16:9");
  assert.equal(gen45.resolution, "720p");
  assert.equal("generate_audio" in gen45, false);

  const hailuo23 = openRouterCanvasVideoBody({
    model: "minimax/hailuo-2.3",
    prompt: "A quiet street at dusk",
    aspectRatio: "16:9",
    durationSeconds: 7,
  });
  assert.equal(hailuo23.resolution, "1080p");
  assert.equal(hailuo23.duration, 6);
  assert.equal("generate_audio" in hailuo23, false);
});

test("openRouterCanvasVideoBody sends Avatar 6 and Avatar 6 Turbo without duration or aspect_ratio", () => {
  for (const model of [
    OPENROUTER_HEYGEN_AVATAR_6_TURBO_VIDEO_MODEL,
    OPENROUTER_HEYGEN_AVATAR_6_VIDEO_MODEL,
  ]) {
    const body = openRouterCanvasVideoBody({
      model,
      prompt: "",
      aspectRatio: "9:16",
      durationSeconds: 42,
      startImageUrl: "https://blob/avatar.png",
      audioUrl: "https://blob/speech.mp3",
    });
    assert.deepEqual(body, {
      model,
      prompt: HEYGEN_AVATAR_6_DEFAULT_PROMPT,
      resolution: "1080p",
      input_references: [
        { type: "image_url", image_url: { url: "https://blob/avatar.png" } },
        { type: "audio_url", audio_url: { url: "https://blob/speech.mp3" } },
      ],
    });
  }

  // A wired prompt is kept, and expressiveness goes out as motion_expressiveness.
  const withPrompt = openRouterHeyGenAudioVideoBody({
    model: OPENROUTER_HEYGEN_AVATAR_6_TURBO_VIDEO_MODEL,
    prompt: "  Calm, friendly delivery  ",
    expressiveness: "high",
    aspectRatio: "16:9",
    durationSeconds: 30,
    startImageUrl: "https://blob/avatar.png",
    audioUrl: "https://blob/speech.mp3",
    callbackUrl: "https://scro.io/cb",
  });
  assert.equal(withPrompt.prompt, "Calm, friendly delivery");
  assert.equal(withPrompt.motion_expressiveness, "high");
  assert.equal(withPrompt.callback_url, "https://scro.io/cb");
  for (const key of ["duration", "aspect_ratio", "motion_prompt", "expressiveness"]) {
    assert.equal(key in withPrompt, false, key);
  }
});

test("openRouterCanvasVideoBody keeps Avatar IV aspect_ratio and motion fields without duration", () => {
  const body = openRouterCanvasVideoBody({
    model: OPENROUTER_HEYGEN_AVATAR_IV_VIDEO_MODEL,
    prompt: "",
    aspectRatio: "9:16",
    durationSeconds: 42,
    startImageUrl: "https://blob/avatar.png",
    audioUrl: "https://blob/speech.mp3",
  });
  assert.equal(body.aspect_ratio, "9:16");
  assert.equal(body.resolution, "1080p");
  assert.equal(body.expressiveness, "low");
  assert.ok(body.prompt.length > 0);
  assert.equal(body.motion_prompt, body.prompt);
  assert.equal("duration" in body, false);
  assert.equal("motion_expressiveness" in body, false);
});

test("isOpenRouterHeyGenAvatarModel covers photo + audio avatars only", () => {
  assert.equal(isOpenRouterHeyGenAvatarModel(OPENROUTER_HEYGEN_AVATAR_IV_VIDEO_MODEL), true);
  assert.equal(isOpenRouterHeyGenAvatarModel(OPENROUTER_HEYGEN_AVATAR_6_VIDEO_MODEL), true);
  assert.equal(isOpenRouterHeyGenAvatarModel(OPENROUTER_HEYGEN_AVATAR_6_TURBO_VIDEO_MODEL), true);
  assert.equal(isOpenRouterHeyGenAvatarModel(OPENROUTER_HEYGEN_VIDEO_1_MODEL), false);
  assert.equal(isOpenRouterHeyGenAvatarModel("minimax/hailuo-3"), false);
  assert.equal(isOpenRouterHeyGenAvatarModel(undefined), false);
});

test("submitOpenRouterCanvasVideo posts canvas video request and returns polling state", async () => {
  const prevKey = process.env.OPENROUTER_API_KEY;
  process.env.OPENROUTER_API_KEY = "sk-or-test";
  let postedBody: Record<string, unknown> | undefined;
  const fakeFetch: typeof fetch = async (_input, init) => {
    postedBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(
      JSON.stringify({
        id: "canvas-vid-1",
        polling_url: "/api/v1/videos/canvas-vid-1",
        status: "pending",
      }),
      { status: 202, headers: { "content-type": "application/json" } },
    );
  };

  try {
    const result = await submitOpenRouterCanvasVideo(
      {
        model: "minimax/hailuo-3",
        prompt: "Drone shot over mountains",
        aspectRatio: "16:9",
        durationSeconds: 5,
      },
      { fetch: fakeFetch },
    );
    assert.equal(postedBody?.model, "minimax/hailuo-3");
    assert.equal("frame_images" in (postedBody || {}), false);
    assert.equal("callback_url" in (postedBody || {}), false);
    assert.equal(result.request_id, "canvas-vid-1");
    assert.equal(result.status, "queued");
    assert.equal(result.status_url, "https://openrouter.ai/api/v1/videos/canvas-vid-1");
  } finally {
    if (prevKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = prevKey;
  }
});
