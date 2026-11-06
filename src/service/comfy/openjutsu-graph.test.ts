import assert from "node:assert/strict";
import test from "node:test";
import { findOutputVideo } from "@/service/comfy/openjutsu-client";
import { ensureMp4HasAudioStream } from "@/service/comfy/ensure-audio";
import { buildObjectGraph, buildSimpleGraph } from "@/service/comfy/openjutsu-graph";
import { canSubmitJutsuComfy } from "@/service/comfy/submit-swap";

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
