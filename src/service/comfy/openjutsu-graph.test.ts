import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { findOutputVideo } from "@/service/comfy/openjutsu-client";
import { ensureMp4HasAudioStream } from "@/service/comfy/ensure-audio";
import {
  buildExtendGraph,
  buildH3ExtendPrompt,
  buildObjectGraph,
  buildSimpleGraph,
  resolveH3ExtendDimensions,
} from "@/service/comfy/openjutsu-graph";
import {
  shouldUseComfyForClipVideo,
  submitComfyStoryboardClipVideo,
} from "@/service/comfy/submit-clip-video";
import {
  canSubmitJutsuComfy,
  composeJutsuCharacterReferenceSheet,
  resolveComfySwapMotionSize,
  resolveJobCharacterReferenceUrls,
  trySubmitJutsuComfy,
} from "@/service/comfy/submit-swap";

const section = { start: 1.5, length: 8 };

test("simple graph matches OpenJutsu defaults and the selected section", () => {
  const graph = buildSimpleGraph({
    videoName: "source.mp4",
    imageName: "person.jpg",
    section,
    role: " the singer ",
    target: "person",
    hatFix: false,
    noLipSync: false,
    margin: "normal",
    motion: 512,
    seed: 0,
    clipSeconds: 6,
    runId: "job1",
  });

  assert.equal(graph["5"].inputs.video, "source.mp4");
  assert.equal(graph["2"].inputs.image, "person.jpg");
  assert.equal(graph["5"].inputs.skip_first_frames, 36);
  assert.equal(graph["5"].inputs.frame_load_cap, 192);
  assert.equal(graph["11"].inputs.resolution, "736p");
  assert.equal(graph["11"].inputs.roles, "the singer");
  assert.equal(graph["11"].inputs.clip_seconds, 6);
  assert.equal(graph["42"].inputs.expand, 40);
  assert.deepEqual(graph["42"].inputs.mask, ["39", 0]);
  assert.equal(graph["47"], undefined);
  assert.equal(graph["68"], undefined);
  assert.equal(graph["15"].inputs.unet_name, "minimax_h3_ref2va_pruned_int8_convrot.safetensors");
  assert.equal(graph["16"].inputs.lora_name, "minimax_h3_DMAD_4step_full_lora_avg_rank_39_bf16.safetensors");
  assert.equal(graph["30"].inputs.ref_image_size, "max");
  assert.match(String(graph["4"].inputs.prompt), /face shape/i);
  assert.equal(graph.scro_run_name.inputs.string_b, "_job1");
  assert.equal(graph["67"].inputs.filename, "swap_%date:yyyy-MM-dd%_job1");
  assert.equal(graph["5_soundtrack"].class_type, "H3SoundtrackOrSilence");
});

test("background object graph flips the mask the way OpenJutsu does", () => {
  const graph = buildObjectGraph({
    videoName: "source.mp4",
    imageName: "room.jpg",
    section,
    mode: "background",
    target: "person",
    changeTo: "a neon rooftop at night",
    biggestOnly: false,
    keepOutline: true,
    margin: "normal",
    motion: 512,
    seed: 0,
    clipSeconds: 6,
    runId: "tele1",
  });

  const grow = Object.values(graph).find((node) => node._meta?.title === "Grow mask");
  const grey = Object.values(graph).find(
    (node) => node._meta?.title === "Turn it grey (shape and movement only)",
  );
  const plan = Object.values(graph).find(
    (node) => node._meta?.title === "Object Swap Plan (what to change)",
  );
  assert.ok(grow && grey && plan);
  assert.equal(grow.inputs.flip_input, true);
  assert.equal(grow.inputs.expand, 20);
  assert.equal(plan.inputs.mode, "background");
  assert.equal(plan.inputs.change_to, "a neon rooftop at night");
  assert.deepEqual(grey.inputs.mask, [Object.keys(graph).find((id) => graph[id] === grow), 0]);
  const video = Object.values(graph).find((node) => node._meta?.title === "Source video");
  assert.equal(video?.inputs.video, "source.mp4");
  assert.equal(video?.inputs.skip_first_frames, 36);
  const assemble = Object.values(graph).find((node) => node.class_type === "MiniMaxH3ChainAssemble");
  assert.equal(assemble?.inputs.filename, "edit_%date:yyyy-MM-dd%_tele1");
});

test("completed history prefers the assembled output copy", () => {
  const file = findOutputVideo({
    "12": {
      gifs: [{ filename: "clip.mp4", subfolder: "h3_chains/job/generation/clips", type: "output" }],
    },
    "67": {
      videos: [{ filename: "swap.mp4", subfolder: "h3_oneclick_swap", type: "output" }],
    },
  });
  assert.deepEqual(file, {
    filename: "swap.mp4",
    subfolder: "h3_oneclick_swap",
    type: "output",
  });
});

test("object history prefers h3_oneclick_edit over the assemble log path", () => {
  const file = findOutputVideo({
    "55": {
      text: [
        "output copy -> /workspace/ComfyUI/output/h3_oneclick_edit/edit_2026-11-04.mp4",
      ],
      images: [{ filename: "edit_2026-11-04.mp4", subfolder: "h3_oneclick_edit", type: "output" }],
    },
  });
  assert.deepEqual(file, {
    filename: "edit_2026-11-04.mp4",
    subfolder: "h3_oneclick_edit",
    type: "output",
  });
});

test("ensureMp4HasAudioStream adds a silent AAC track to a video-only MP4 and leaves voiced MP4s untouched", async () => {
  const { mkdtemp, readFile, rm, writeFile } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { ffmpegStderr, runFfmpeg } = await import("@/service/reel/concat");

  const dir = await mkdtemp(join(tmpdir(), "comfy-audio-test-"));
  try {
    await runFfmpeg(dir, [
      "-y",
      "-f",
      "lavfi",
      "-i",
      "color=c=black:s=64x64:d=1",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "silent.mp4",
    ]);
    const videoOnly = await readFile(join(dir, "silent.mp4"));
    const probeBefore = await ffmpegStderr(dir, ["-i", "silent.mp4"]);
    assert.equal(/Audio:/.test(probeBefore), false);

    const withAudio = await ensureMp4HasAudioStream(videoOnly);
    await writeFile(join(dir, "with-audio.mp4"), withAudio);
    const probeAfter = await ffmpegStderr(dir, ["-i", "with-audio.mp4"]);
    assert.equal(/Audio:/.test(probeAfter), true);

    // Calling again on a file that already has audio returns the exact same buffer without re-muxing
    const secondPass = await ensureMp4HasAudioStream(withAudio);
    assert.equal(secondPass, withAudio);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("canSubmitJutsuComfy only enables ComfyUI fast-path for character/object video swaps when configured", () => {
  const prevUrl = process.env.COMFY_BASE_URL;
  const prevKey = process.env.COMFY_API_KEY;
  try {
    process.env.COMFY_BASE_URL = "https://comfy.example.com";
    process.env.COMFY_API_KEY = "secret";
    assert.equal(
      canSubmitJutsuComfy({ sourceMediaKind: "video", mode: "character_swap" }),
      true,
    );
    assert.equal(
      canSubmitJutsuComfy({ sourceMediaKind: "gif", mode: "object_swap" }),
      true,
    );
    assert.equal(
      canSubmitJutsuComfy({ sourceMediaKind: "image", mode: "character_swap" }),
      false,
    );
    assert.equal(
      canSubmitJutsuComfy({ sourceMediaKind: "video", mode: "relight_video" }),
      false,
    );
    assert.equal(
      canSubmitJutsuComfy({
        sourceMediaKind: "video",
        mode: "character_swap",
        relightId: "golden_halo",
      }),
      false,
    );
    assert.equal(
      canSubmitJutsuComfy({
        sourceMediaKind: "video",
        mode: "character_swap",
        customLightPrompt: "Neon cyber rim light",
      }),
      false,
    );
    assert.equal(
      canSubmitJutsuComfy({
        sourceMediaKind: "video",
        mode: "character_swap",
        personMappings: [
          {
            objectId: 0,
            personIndex: 1,
            anchorPoint: { x: 0.3, y: 0.5 },
            box: { x: 0.1, y: 0.2, width: 0.3, height: 0.6 },
            referenceImageUrl: "https://blob.test/p1.png",
          },
          {
            objectId: 1,
            personIndex: 2,
            anchorPoint: { x: 0.7, y: 0.5 },
            box: { x: 0.5, y: 0.2, width: 0.3, height: 0.6 },
            referenceImageUrl: "https://blob.test/p2.png",
          },
        ],
      }),
      false,
    );
    assert.equal(
      canSubmitJutsuComfy({
        sourceMediaKind: "video",
        mode: "character_swap",
        totalDetectedPeople: 2,
        personMappings: [
          {
            objectId: 0,
            personIndex: 1,
            anchorPoint: { x: 0.3, y: 0.5 },
            box: { x: 0.1, y: 0.2, width: 0.3, height: 0.6 },
            referenceImageUrl: "https://blob.test/p1.png",
          },
        ],
      }),
      false,
    );

    delete process.env.COMFY_BASE_URL;
    assert.equal(
      canSubmitJutsuComfy({ sourceMediaKind: "video", mode: "character_swap" }),
      false,
    );
  } finally {
    if (prevUrl === undefined) delete process.env.COMFY_BASE_URL;
    else process.env.COMFY_BASE_URL = prevUrl;
    if (prevKey === undefined) delete process.env.COMFY_API_KEY;
    else process.env.COMFY_API_KEY = prevKey;
  }
});

test("resolveComfySwapMotionSize upgrades 512 to 768 when the subject is small in the frame", () => {
  assert.equal(
    resolveComfySwapMotionSize({
      motionSize: 512,
      personMappings: [
        {
          objectId: 0,
          personIndex: 1,
          anchorPoint: { x: 0.55, y: 0.54 },
          box: { x: 0.46, y: 0.41, width: 0.24, height: 0.27 },
          referenceImageUrl: "https://blob.test/cathy-standing.png",
        },
      ],
    }),
    768,
  );
  assert.equal(
    resolveComfySwapMotionSize({
      motionSize: 512,
      personMappings: [
        {
          objectId: 0,
          personIndex: 1,
          anchorPoint: { x: 0.5, y: 0.5 },
          box: { x: 0.2, y: 0.1, width: 0.6, height: 0.75 },
          referenceImageUrl: "https://blob.test/closeup.png",
        },
      ],
    }),
    512,
  );
  assert.equal(
    resolveComfySwapMotionSize({
      motionSize: 1376,
    }),
    1376,
  );
});

test("trySubmitJutsuComfy leaves H3OneClickSwapPlan roles blank so Node 10 video_people strips original clothing", async () => {
  const { mkdtemp, readFile, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { runFfmpeg } = await import("@/service/reel/concat");
  const { ObjectId } = await import("mongodb");

  const prevUrl = process.env.COMFY_BASE_URL;
  const prevKey = process.env.COMFY_API_KEY;
  const dir = await mkdtemp(join(tmpdir(), "comfy-submit-test-"));

  try {
    process.env.COMFY_BASE_URL = "https://comfy.example.com";
    process.env.COMFY_API_KEY = "secret";

    await runFfmpeg(dir, [
      "-y",
      "-f",
      "lavfi",
      "-i",
      "color=c=black:s=64x64:d=1",
      "-f",
      "lavfi",
      "-i",
      "anullsrc=r=44100:cl=stereo",
      "-t",
      "1",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "voiced.mp4",
    ]);
    const voicedMp4 = await readFile(join(dir, "voiced.mp4"));

    let submittedPromptGraph: Record<string, { inputs: Record<string, unknown>; _meta?: { title?: string } }> | undefined;
    const fakeFetch: typeof fetch = async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url === "https://blob.test/cathy-standing.png") {
        return new Response(new Uint8Array([137, 80, 78, 71]), { status: 200 });
      }
      if (url.endsWith("/upload/image")) {
        return Response.json({ name: "uploaded-asset" }, { status: 200 });
      }
      if (url.endsWith("/prompt")) {
        const body = JSON.parse(String(init?.body ?? "{}")) as {
          prompt?: Record<string, { inputs: Record<string, unknown>; _meta?: { title?: string } }>;
        };
        submittedPromptGraph = body.prompt;
        return Response.json({ prompt_id: "prompt-123" }, { status: 200 });
      }
      throw new Error(`Unexpected fetch URL: ${url}`);
    };

    const res = await trySubmitJutsuComfy(
      {
        _id: new ObjectId("6aee3fece8f79939352b1887"),
        userId: new ObjectId("6abcc45aebdb844ee2cd8413"),
        clerkUserId: "u1",
        mode: "character_swap",
        status: "rendering",
        sourceVideoUrl: "https://blob.test/source.mp4",
        sourceMediaKind: "video",
        aspectRatio: "9:16",
        sectionStart: 3,
        sectionLength: 6,
        characterName: "Cathy",
        referenceImageUrl: "https://blob.test/cathy-standing.png",
        personMappings: [
          {
            objectId: 0,
            personIndex: 1,
            anchorPoint: { x: 0.557, y: 0.546 },
            box: { x: 0.464, y: 0.419, width: 0.239, height: 0.272 },
            characterName: "Cathy",
            referenceImageUrl: "https://blob.test/cathy-standing.png",
          },
        ],
        motionSize: 512,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      voicedMp4,
      fakeFetch,
    );

    assert.equal(res?.request_id, "prompt-123");
    assert.ok(submittedPromptGraph);
    // Node 11 (H3OneClickSwapPlan) roles MUST be empty string ("") rather than "Cathy"
    assert.equal(submittedPromptGraph["11"]?.inputs.roles, "");
    // Node 32 (Motion reference video) is auto-upgraded to 768 because box.height (0.272) < 0.45
    assert.equal(submittedPromptGraph["32"]?.inputs.largest_size, 768);
    // Node 30 (MiniMaxH3ReferenceToVideo) uses ref_image_size = "max"
    assert.equal(submittedPromptGraph["30"]?.inputs.ref_image_size, "max");
  } finally {
    if (prevUrl === undefined) delete process.env.COMFY_BASE_URL;
    else process.env.COMFY_BASE_URL = prevUrl;
    if (prevKey === undefined) delete process.env.COMFY_API_KEY;
    else process.env.COMFY_API_KEY = prevKey;
    await rm(dir, { recursive: true, force: true });
  }
});

test("resolveJobCharacterReferenceUrls and composeJutsuCharacterReferenceSheet support single and multiple character reference photos for ComfyUI", async () => {
  const { mkdtemp, readFile, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { runFfmpeg } = await import("@/service/reel/concat");
  const { ObjectId } = await import("mongodb");

  assert.deepEqual(
    resolveJobCharacterReferenceUrls({
      referenceImageUrl: "https://blob.test/fallback.jpg",
      referenceImageUrls: ["https://blob.test/a.jpg", "https://blob.test/b.jpg"],
    }),
    ["https://blob.test/a.jpg", "https://blob.test/b.jpg"],
  );
  assert.deepEqual(
    resolveJobCharacterReferenceUrls({
      referenceImageUrl: "https://blob.test/fallback.jpg",
      personMappings: [
        {
          objectId: 0,
          personIndex: 1,
          anchorPoint: { x: 0.5, y: 0.5 },
          box: { x: 0.2, y: 0.2, width: 0.4, height: 0.6 },
          referenceImageUrl: "https://blob.test/p1-a.jpg",
          referenceImageUrls: ["https://blob.test/p1-a.jpg", "https://blob.test/p1-b.jpg"],
        },
      ],
    }),
    ["https://blob.test/p1-a.jpg", "https://blob.test/p1-b.jpg"],
  );

  const img1 = await sharp({
    create: { width: 200, height: 300, channels: 3, background: { r: 220, g: 40, b: 40 } },
  })
    .png()
    .toBuffer();
  const img2 = await sharp({
    create: { width: 300, height: 200, channels: 4, background: { r: 40, g: 220, b: 80, alpha: 0.9 } },
  })
    .png()
    .toBuffer();
  const img3 = await sharp({
    create: { width: 240, height: 360, channels: 3, background: { r: 40, g: 80, b: 220 } },
  })
    .jpeg()
    .toBuffer();

  // Single image returns the exact same buffer without re-encoding
  const singleOut = await composeJutsuCharacterReferenceSheet([img1]);
  assert.equal(singleOut, img1);

  // Multiple images (2..6) stitch into a composite JPEG reference sheet
  const multiOut = await composeJutsuCharacterReferenceSheet([img1, img2, img3]);
  const multiMeta = await sharp(multiOut).metadata();
  assert.equal(multiMeta.format, "jpeg");
  assert.ok((multiMeta.width ?? 0) >= 1200);
  assert.ok((multiMeta.height ?? 0) >= 600);

  // Verify trySubmitJutsuComfy fetches all character reference URLs and uploads the composite sheet
  const prevUrl = process.env.COMFY_BASE_URL;
  const prevKey = process.env.COMFY_API_KEY;
  const dir = await mkdtemp(join(tmpdir(), "comfy-multiref-test-"));
  try {
    process.env.COMFY_BASE_URL = "https://comfy.example.com";
    process.env.COMFY_API_KEY = "secret";

    await runFfmpeg(dir, [
      "-y",
      "-f",
      "lavfi",
      "-i",
      "color=c=black:s=64x64:d=1",
      "-f",
      "lavfi",
      "-i",
      "anullsrc=r=44100:cl=stereo",
      "-t",
      "1",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "voiced.mp4",
    ]);
    const voicedMp4 = await readFile(join(dir, "voiced.mp4"));

    const fetchedImageUrls: string[] = [];
    const fakeFetch: typeof fetch = async (input) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url === "https://blob.test/front.png") {
        fetchedImageUrls.push(url);
        return new Response(new Uint8Array(img1), { status: 200 });
      }
      if (url === "https://blob.test/fullbody.png") {
        fetchedImageUrls.push(url);
        return new Response(new Uint8Array(img2), { status: 200 });
      }
      if (url.endsWith("/upload/image")) {
        return Response.json({ name: "uploaded-composite.jpg" }, { status: 200 });
      }
      if (url.endsWith("/prompt")) {
        return Response.json({ prompt_id: "prompt-multiref" }, { status: 200 });
      }
      throw new Error(`Unexpected fetch URL: ${url}`);
    };

    const res = await trySubmitJutsuComfy(
      {
        _id: new ObjectId("6aee3fece8f79939352b1888"),
        userId: new ObjectId("6abcc45aebdb844ee2cd8413"),
        clerkUserId: "u1",
        mode: "character_swap",
        status: "rendering",
        sourceVideoUrl: "https://blob.test/source.mp4",
        sourceMediaKind: "video",
        aspectRatio: "9:16",
        sectionStart: 0,
        sectionLength: 6,
        referenceImageUrl: "https://blob.test/front.png",
        referenceImageUrls: ["https://blob.test/front.png", "https://blob.test/fullbody.png"],
        motionSize: 512,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      voicedMp4,
      fakeFetch,
    );

    assert.equal(res?.request_id, "prompt-multiref");
    assert.deepEqual(fetchedImageUrls, [
      "https://blob.test/front.png",
      "https://blob.test/fullbody.png",
    ]);
  } finally {
    if (prevUrl === undefined) delete process.env.COMFY_BASE_URL;
    else process.env.COMFY_BASE_URL = prevUrl;
    if (prevKey === undefined) delete process.env.COMFY_API_KEY;
    else process.env.COMFY_API_KEY = prevKey;
    await rm(dir, { recursive: true, force: true });
  }
});

test("buildH3ExtendPrompt numbers reference pictures sequentially and prevents pulling moving subjects back to static poses", () => {
  const promptAll = buildH3ExtendPrompt({
    extensionPrompt: "She turns toward the camera and lifts the coffee cup.",
    hasCharacterImage: true,
    hasSceneImage: true,
    hasPropImage: true,
    refVideoSeconds: 6,
  });
  assert.match(promptAll, /<Video 1>/);
  assert.match(promptAll, /<Picture 1>.*<Subject 1>/);
  assert.match(promptAll, /<Picture 2>.*setting/i);
  assert.match(promptAll, /<Picture 3>.*prop/i);
  assert.match(promptAll, /\[video continuation \+ reference generation\]/);
  assert.match(promptAll, /without pulling the moving subject back to the static/i);
  assert.match(promptAll, /She turns toward the camera and lifts the coffee cup\./);

  const promptPropOnly = buildH3ExtendPrompt({
    extensionPrompt: "Camera pans right to reveal the mug on the table.",
    hasCharacterImage: false,
    hasSceneImage: false,
    hasPropImage: true,
    refVideoSeconds: 4.5,
  });
  assert.match(promptPropOnly, /<Picture 1>.*prop/i);
  assert.doesNotMatch(promptPropOnly, /<Picture 2>/);
});

test("buildExtendGraph configures 39-frame latent prefix, last-6s reference video, dynamic ref_images, and h3_oneclick_extend output", () => {
  assert.deepEqual(resolveH3ExtendDimensions("9:16"), { width: 736, height: 1312 });
  assert.deepEqual(resolveH3ExtendDimensions("16:9"), { width: 1312, height: 736 });
  assert.deepEqual(resolveH3ExtendDimensions("1:1"), { width: 736, height: 736 });

  const graph = buildExtendGraph({
    videoName: "clip2.mp4",
    clipDurationSeconds: 8.5,
    extensionPrompt: "Continue walking down the neon street as rain falls.",
    characterImageName: "char_sheet.jpg",
    sceneImageName: null,
    propImageName: "umbrella.jpg",
    aspectRatio: "9:16",
    seed: 42,
    runId: "ext1",
  });

  // VHS_LoadVideo skips to the last 6s: round((8.5 - 6) * 24) = 60, frame_load_cap = 144
  assert.equal(graph["5"].inputs.video, "clip2.mp4");
  assert.equal(graph["5"].inputs.skip_first_frames, 60);
  assert.equal(graph["5"].inputs.frame_load_cap, 144);
  assert.equal(graph["5_soundtrack"]?.class_type, "H3SoundtrackOrSilence");

  // MiniMaxH3ChainExternalVideo encodes the last 39 frames into the target latent prefix without prepending the original clip
  const extVideo = Object.values(graph).find((n) => n.class_type === "MiniMaxH3ChainExternalVideo");
  assert.ok(extVideo);
  assert.equal(extVideo.inputs.prepend_original, false);

  // Plan has 192 total frames (39 context prefix + 153 new frames = 6.375s) and 736x1312 dimensions
  const plan = Object.values(graph).find((n) => n.class_type === "MiniMaxH3ChainPlanModern");
  assert.ok(plan);
  assert.equal(plan.inputs.width, 736);
  assert.equal(plan.inputs.height, 1312);
  assert.equal(plan.inputs.run_name, "extend_ext1");
  const planJson = JSON.parse(String(plan.inputs.plan_json)) as {
    shots: Array<{ length: number; steps: number; prompt: string }>;
  };
  assert.equal(planJson.shots[0]?.length, 192);
  assert.equal(planJson.shots[0]?.steps, 6);

  // Reference Conditioning compacts characterImageName (ref_image_0) and propImageName (ref_image_1), deleting unused scene image loader
  const refNode = Object.values(graph).find((n) => n.class_type === "MiniMaxH3ReferenceToVideo");
  assert.ok(refNode);
  assert.equal(refNode.inputs.ref_image_size, "max");
  assert.ok(refNode.inputs["ref_images.ref_image_0"]);
  assert.ok(refNode.inputs["ref_images.ref_image_1"]);
  assert.equal(refNode.inputs["ref_images.ref_image_2"], undefined);
  assert.ok(refNode.inputs["ref_videos.ref_video_0"]);

  // Short clips (<= 6s) clamp skip_first_frames to 0
  const shortGraph = buildExtendGraph({
    videoName: "short.mp4",
    clipDurationSeconds: 4,
    extensionPrompt: "Keep smiling.",
    aspectRatio: "16:9",
    seed: 0,
    runId: "ext2",
  });
  assert.equal(shortGraph["5"].inputs.skip_first_frames, 0);
  assert.equal(shortGraph["5"].inputs.frame_load_cap, 144);

  // Assemble writes to h3_oneclick_extend and findOutputVideo ranks it at priority 3
  const assemble = Object.values(graph).find((n) => n.class_type === "MiniMaxH3ChainAssemble");
  assert.equal(assemble?.inputs.output_subfolder, "h3_oneclick_extend");
  assert.match(String(assemble?.inputs.filename), /_ext1$/);

  const picked = findOutputVideo({
    "67": {
      videos: [{ filename: "extend_ext1.mp4", subfolder: "h3_oneclick_extend", type: "output" }],
    },
  });
  assert.deepEqual(picked, {
    filename: "extend_ext1.mp4",
    subfolder: "h3_oneclick_extend",
    type: "output",
  });
});

test("shouldUseComfyForClipVideo is opt-in via COMFY_CLIP_VIDEO_ENABLED and submitComfyStoryboardClipVideo queues a ref2va graph", async () => {
  const prevUrl = process.env.COMFY_BASE_URL;
  const prevKey = process.env.COMFY_API_KEY;
  const prevFlag = process.env.COMFY_CLIP_VIDEO_ENABLED;
  try {
    process.env.COMFY_BASE_URL = "https://comfy.example.com";
    process.env.COMFY_API_KEY = "secret";
    delete process.env.COMFY_CLIP_VIDEO_ENABLED;

    assert.equal(
      shouldUseComfyForClipVideo({ model: "minimax/hailuo-3" }),
      false,
    );

    process.env.COMFY_CLIP_VIDEO_ENABLED = "true";
    assert.equal(
      shouldUseComfyForClipVideo({ model: "minimax/hailuo-3" }),
      true,
    );
    assert.equal(
      shouldUseComfyForClipVideo({ model: "minimax/hailuo-3", audioUrl: "https://blob.test/vo.mp3" }),
      false,
    );
    assert.equal(
      shouldUseComfyForClipVideo({ model: "alibaba/wan-3.0" }),
      false,
    );

    let queuedPrompt: Record<string, unknown> | undefined;
    const fakeFetch: typeof fetch = async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url.startsWith("https://blob.test/")) {
        return new Response(new Uint8Array([255, 216, 255]), { status: 200 });
      }
      if (url.endsWith("/upload/image")) {
        return Response.json({ name: "frame.jpg" }, { status: 200 });
      }
      if (url.endsWith("/prompt")) {
        queuedPrompt = (JSON.parse(String(init?.body ?? "{}")) as { prompt?: Record<string, unknown> }).prompt;
        return Response.json({ prompt_id: "clip-comfy-1" }, { status: 200 });
      }
      throw new Error(`Unexpected fetch URL: ${url}`);
    };

    const submitted = await submitComfyStoryboardClipVideo(
      {
        prompt: "Camera dollies in as she opens the laptop.",
        aspectRatio: "9:16",
        durationSeconds: 6,
        startImageUrl: "https://blob.test/start.webp",
        endImageUrl: "https://blob.test/end.webp",
      },
      { fetch: fakeFetch },
    );
    assert.equal(submitted.request_id, "clip-comfy-1");
    assert.equal(submitted.status_url, "comfy://prompt/clip-comfy-1");
    assert.ok(queuedPrompt);
  } finally {
    if (prevUrl === undefined) delete process.env.COMFY_BASE_URL;
    else process.env.COMFY_BASE_URL = prevUrl;
    if (prevKey === undefined) delete process.env.COMFY_API_KEY;
    else process.env.COMFY_API_KEY = prevKey;
    if (prevFlag === undefined) delete process.env.COMFY_CLIP_VIDEO_ENABLED;
    else process.env.COMFY_CLIP_VIDEO_ENABLED = prevFlag;
  }
});
