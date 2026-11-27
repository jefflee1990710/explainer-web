import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, it } from "node:test";
import { ObjectId } from "mongodb";
import type { CanvasJob } from "@/model/canvas";
import { executeCanvasFfmpegJob } from "@/service/canvas/execution/ffmpeg-ops";
import { intermediateQualityArgs } from "@/service/canvas/execution/ffmpeg-params";
import { submitFusedChain } from "@/service/canvas/execution/flow/fused-submit";
import { planWaveChains } from "@/service/canvas/execution/flow/run";
import { executeCanvasNodeTask } from "@/service/canvas/execution/worker-runner";
import type { CanvasFlowRunState } from "@/model/canvas";

function job(nodeId: string, modelId: string, snapshot: Record<string, unknown>, extra: Partial<CanvasJob> = {}): CanvasJob {
  return {
    _id: new ObjectId(),
    clerkUserId: "u1",
    canvasId: new ObjectId(),
    nodeId,
    provider: "ffmpeg",
    modelId,
    providerModelId: modelId.replace("ffmpeg:", ""),
    status: "queued",
    inputSnapshot: snapshot,
    chargedUsd: 0,
    outputKind: "video",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...extra,
  };
}

describe("intermediateQualityArgs", () => {
  it("raises x264 and NVENC quality, leaving stream copies alone", () => {
    assert.deepEqual(intermediateQualityArgs(["-i", "a", "-c:v", "libx264", "-pix_fmt", "yuv420p", "o.mp4"]), [
      "-i", "a", "-c:v", "libx264", "-preset", "veryfast", "-crf", "12", "-pix_fmt", "yuv420p", "o.mp4",
    ]);
    assert.deepEqual(
      intermediateQualityArgs(["-c:v", "libx264", "-crf", "23", "-preset", "medium", "o.mp4"]),
      ["-c:v", "libx264", "-crf", "12", "-preset", "veryfast", "o.mp4"],
    );
    assert.deepEqual(intermediateQualityArgs(["-c:v", "h264_nvenc", "-cq", "20"]), ["-c:v", "h264_nvenc", "-cq", "12"]);
    assert.deepEqual(intermediateQualityArgs(["-c", "copy", "o.mp4"]), ["-c", "copy", "o.mp4"]);
  });
});

describe("fused FFmpeg chain execution", () => {
  it("renders every step in one run, passing files locally and saving each output", async () => {
    const head = job("trim", "ffmpeg:trim-speed", { video: "https://blob.example/src.mp4", toolParams: { ffmpegSpeed: 2 } });
    const mid = job("crop", "ffmpeg:rotate", { video: "fused://trim", toolParams: { ffmpegRotate: "90" } });
    const tail = job("vol", "ffmpeg:volume", { video: "fused://crop", toolParams: { ffmpegVolumeDb: 3 } });
    head.fusedJobIds = [mid._id.toHexString(), tail._id.toHexString()];
    const jobs = new Map([head, mid, tail].map((j) => [j._id.toHexString(), j]));
    const downloads: string[] = [];
    const runs: string[][] = [];
    const completed: string[] = [];
    const res = await executeCanvasFfmpegJob(head._id, {
      findCanvasJob: async (id) => jobs.get(id.toHexString()) ?? null,
      downloadToFile: async (url, dest) => {
        downloads.push(url);
        await writeFile(dest, "src");
      },
      probeStderr: async () => "Duration: 00:00:04.00, start: 0\nStream #0:0: Video: h264, 1080x1920\nStream #0:1: Audio: aac",
      runFfmpeg: async (dir, args) => {
        runs.push(args);
        await writeFile(join(dir, args.at(-1)!), `out-${runs.length}`);
      },
      persistBuffer: async (_buf, pathname) => `https://blob.example/${pathname}`,
      updateCanvasJob: async (id, _user, update) => {
        if (update.$set?.status === "completed") completed.push(id.toHexString());
      },
      updateCanvasNodeState: async () => {},
    });
    assert.equal(res.outcome, "completed");
    assert.deepEqual(downloads, ["https://blob.example/src.mp4"]);
    assert.equal(runs.length, 3);
    assert.ok(runs[0]!.includes("-crf") && runs[1]!.includes("-crf"), "middle steps encode near-lossless");
    assert.ok(!runs[2]!.includes("12"), "the last step keeps the normal encode");
    assert.deepEqual(completed, [head, mid, tail].map((j) => j._id.toHexString()));
  });

  it("fails the broken step and everything after it, keeping earlier outputs", async () => {
    const head = job("a", "ffmpeg:trim-speed", { video: "https://blob.example/src.mp4" });
    const mid = job("b", "ffmpeg:rotate", { video: "fused://a" });
    const tail = job("c", "ffmpeg:volume", { video: "fused://b" });
    head.fusedJobIds = [mid._id.toHexString(), tail._id.toHexString()];
    const jobs = new Map([head, mid, tail].map((j) => [j._id.toHexString(), j]));
    const status = new Map<string, string>();
    let run = 0;
    const res = await executeCanvasFfmpegJob(head._id, {
      findCanvasJob: async (id) => jobs.get(id.toHexString()) ?? null,
      downloadToFile: async (_url, dest) => writeFile(dest, "src"),
      probeStderr: async () => "Duration: 00:00:04.00, start: 0\nStream #0:0: Video: h264, 720x1280",
      runFfmpeg: async (dir, args) => {
        run += 1;
        if (run === 2) throw new Error("boom");
        await writeFile(join(dir, args.at(-1)!), "x");
      },
      persistBuffer: async (_b, p) => `https://blob.example/${p}`,
      updateCanvasJob: async (id, _u, update) => {
        if (update.$set?.status) status.set(id.toHexString(), update.$set.status);
      },
      updateCanvasNodeState: async () => {},
    });
    assert.equal(res.outcome, "completed");
    assert.equal(status.get(head._id.toHexString()), "completed");
    assert.equal(status.get(mid._id.toHexString()), "failed");
    assert.equal(status.get(tail._id.toHexString()), "failed");
  });
});

describe("fused chain submit and flow planning", () => {
  it("queues one job per node, starting only the head worker", async () => {
    const calls: Array<Record<string, unknown>> = [];
    let linked: string[] = [];
    let started = "";
    const res = await submitFusedChain(
      { clerkUserId: "u1", canvasId: new ObjectId().toHexString(), flowRunId: "flow-1", nodeIds: ["a", "b", "c"] },
      {
        submit: async (input) => {
          calls.push({ ...input });
          if (input.nodeId === "c") return { ok: false, code: "INVALID_INPUTS", error: "bad" };
          return { ok: true, job: job(input.nodeId, "ffmpeg:crop", {}), creditUsd: 0 };
        },
        linkFollowers: async (_head, ids) => {
          linked = ids;
        },
        startWorker: async (id) => {
          started = id.toHexString();
        },
      },
    );
    assert.ok(res.ok);
    assert.equal(res.jobs.length, 2, "the chain stops at the node that could not be queued");
    assert.deepEqual(calls.map((c) => c.fusedUpstream ?? null), [null, ["a"], ["a", "b"]]);
    assert.ok(calls.every((c) => c.deferWorker === true));
    assert.equal(calls[1]!.fusedIntoJobId, res.jobs[0]!._id.toHexString());
    assert.deepEqual(linked, [res.jobs[1]!._id.toHexString()]);
    assert.equal(started, res.jobs[0]!._id.toHexString());
  });

  it("plans chains only through nodes this flow will run", () => {
    const m = (id: string, modelId: string, status = "idle") => ({
      id,
      type: "model" as const,
      position: { x: 0, y: 0 },
      data: { modelId, status: status as "idle" },
    });
    const e = (source: string, target: string) => ({
      id: `${source}-${target}`,
      source,
      target,
      sourceHandle: "output",
      targetHandle: "video",
    });
    const project = {
      nodes: [m("t", "ffmpeg:trim-speed"), m("f", "ffmpeg:fade"), m("v", "ffmpeg:volume"), m("x", "ffmpeg:crop")],
      edges: [e("t", "f"), e("f", "v"), e("x", "v")],
    };
    const run = { waves: [["t", "x"], ["f"], ["v"]] } as unknown as CanvasFlowRunState;
    const chains = planWaveChains(project, run, 0, ["t", "x"], new Set());
    // v also waits on x, which runs in this same wave, so the chain stops at f.
    assert.deepEqual([...chains.entries()], [["t", ["t", "f"]]]);
  });
});

describe("fused follower worker task", () => {
  it("waits for its head and fails once the head has failed", async () => {
    const head = job("a", "ffmpeg:trim-speed", {});
    const follower = job("b", "ffmpeg:fade", {}, { fusedIntoJobId: head._id.toHexString() });
    let failed = "";
    const deps = (headStatus: CanvasJob["status"]) => ({
      findCanvasJob: async (id: ObjectId) =>
        id.equals(head._id) ? { ...head, status: headStatus } : follower,
      runFfmpegJob: async () => {
        throw new Error("followers never run alone");
      },
      failFusedFollower: async (_j: CanvasJob, error: string) => {
        failed = error;
      },
    });
    const waiting = await executeCanvasNodeTask(follower._id, deps("queued"));
    assert.equal(waiting.outcome, "completed");
    assert.equal(failed, "");
    const after = await executeCanvasNodeTask(follower._id, deps("failed"));
    assert.equal(after.outcome, "failed");
    assert.ok(failed);
  });
});
