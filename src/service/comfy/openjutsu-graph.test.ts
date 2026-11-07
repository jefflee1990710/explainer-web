import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { findOutputVideo } from "@/service/comfy/openjutsu-client";
import { ensureMp4HasAudioStream } from "@/service/comfy/ensure-audio";
import { buildObjectGraph, buildSimpleGraph } from "@/service/comfy/openjutsu-graph";
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
