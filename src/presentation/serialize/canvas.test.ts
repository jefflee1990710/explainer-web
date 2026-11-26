import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ObjectId } from "mongodb";
import type { CanvasJob, CanvasProject } from "@/model/canvas";
import {
  serializeCanvasFlowRun,
  serializeCanvasJob,
  serializeCanvasProject,
  serializeCanvasProjectSummary,
} from "@/presentation/serialize/canvas";

describe("presentation/serialize/canvas", () => {
  it("serializes flow run state with defaulted failedNodeIds and optional error", () => {
    const dto = serializeCanvasFlowRun({
      flowRunId: "flow-1",
      status: "running",
      currentWave: 2,
      totalWaves: 4,
      failedNodeIds: ["n0"],
      error: "Clip failed",
    });

    assert.deepEqual(dto, {
      flowRunId: "flow-1",
      status: "running",
      currentWave: 2,
      totalWaves: 4,
      failedNodeIds: ["n0"],
      error: "Clip failed",
    });
  });

  it("marks orphan busy nodes failed when no flow is running and preserves them when flow is running", () => {
    const baseProject: CanvasProject = {
      _id: new ObjectId("674500000000000000000001"),
      clerkUserId: "user_1",
      title: "Demo Canvas",
      thumbnailUrl: "https://blob.example/thumb.png",
      viewport: { x: 10, y: 20, zoom: 1.25 },
      nodes: [
        {
          id: "m1",
          type: "model",
          position: { x: 0, y: 0 },
          data: { modelId: "openrouter:bytedance-seed/seedream-5-0-pro", status: "running" },
        },
      ],
      edges: [],
      createdAt: new Date("2026-11-26T01:00:00.000Z"),
      updatedAt: new Date("2026-11-26T02:00:00.000Z"),
    };

    const idleSerialized = serializeCanvasProject(baseProject);
    assert.equal(idleSerialized.id, "674500000000000000000001");
    assert.equal(idleSerialized.nodes[0]?.data.status, "failed");
    assert.equal(idleSerialized.activeFlowRun, undefined);

    const runningSerialized = serializeCanvasProject({
      ...baseProject,
      activeFlowRun: {
        flowRunId: "flow-live",
        status: "running",
        currentWave: 1,
        totalWaves: 1,
        waveIndex: 0,
        waves: [["m1"]],
        activeWaveJobIds: [],
        failedNodeIds: [],
        startedAt: new Date("2026-11-26T01:30:00.000Z"),
        updatedAt: new Date("2026-11-26T01:30:00.000Z"),
      },
    });
    assert.equal(runningSerialized.nodes[0]?.data.status, "running");
    assert.equal(runningSerialized.activeFlowRun?.flowRunId, "flow-live");
  });

  it("serializes project summary and job DTOs with ISO timestamps", () => {
    const projectId = new ObjectId("674500000000000000000002");
    const folderId = new ObjectId("674500000000000000000003");
    const jobId = new ObjectId("674500000000000000000004");

    const summary = serializeCanvasProjectSummary({
      _id: projectId,
      clerkUserId: "user_1",
      title: "Summary Canvas",
      folderId,
      viewport: { x: 0, y: 0, zoom: 1 },
      nodes: [
        { id: "p1", type: "prompt", position: { x: 0, y: 0 }, data: { text: "hi" } },
      ],
      edges: [],
      createdAt: new Date("2026-11-26T03:00:00.000Z"),
      updatedAt: new Date("2026-11-26T04:00:00.000Z"),
    });

    assert.deepEqual(summary, {
      id: "674500000000000000000002",
      title: "Summary Canvas",
      nodeCount: 1,
      folderId: "674500000000000000000003",
      createdAt: "2026-11-26T03:00:00.000Z",
      updatedAt: "2026-11-26T04:00:00.000Z",
    });

    const job: CanvasJob = {
      _id: jobId,
      clerkUserId: "user_1",
      canvasId: projectId,
      nodeId: "m1",
      flowRunId: "flow-9",
      provider: "openrouter",
      modelId: "openrouter:bytedance-seed/seedream-5-0-pro",
      providerModelId: "bytedance-seed/seedream-5-0-pro",
      presetId: "16:9",
      status: "completed",
      externalJobId: "ext-1",
      inputSnapshot: {},
      chargedUsd: 0.135,
      outputUrl: "https://blob.example/out.png",
      outputKind: "image",
      createdAt: new Date("2026-11-26T05:00:00.000Z"),
      updatedAt: new Date("2026-11-26T05:00:05.000Z"),
    };

    assert.deepEqual(serializeCanvasJob(job), {
      id: "674500000000000000000004",
      canvasId: "674500000000000000000002",
      nodeId: "m1",
      flowRunId: "flow-9",
      provider: "openrouter",
      modelId: "openrouter:bytedance-seed/seedream-5-0-pro",
      providerModelId: "bytedance-seed/seedream-5-0-pro",
      presetId: "16:9",
      status: "completed",
      externalJobId: "ext-1",
      chargedUsd: 0.135,
      outputUrl: "https://blob.example/out.png",
      outputKind: "image",
      createdAt: "2026-11-26T05:00:00.000Z",
      updatedAt: "2026-11-26T05:00:05.000Z",
    });
  });
});
