import assert from "node:assert/strict";
import test from "node:test";
import { findOutputVideo } from "@/service/comfy/openjutsu-client";
import { buildObjectGraph, buildSimpleGraph } from "@/service/comfy/openjutsu-graph";

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
