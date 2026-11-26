import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ObjectId } from "mongodb";
import type { CanvasJob, CanvasProject } from "@/model/canvas";
import {
  pollCanvasFlowForClient,
  pollCanvasJobsForClient,
  runCanvasFlowWithPreSave,
  runCanvasNodeWithPreSave,
} from "@/service/canvas/runtime";

describe("service/canvas/runtime", () => {
  it("saves graph snapshot first and returns waitingForUpstream when wired upstream is busy", async () => {
    const savedCalls: Array<Record<string, unknown>> = [];
    let submitCalled = false;

    const res = await runCanvasNodeWithPreSave(
      {
        clerkUserId: "user-1",
        canvasId: new ObjectId().toHexString(),
        nodeId: "node-2",
        nodes: [],
        edges: [],
      },
      {
        saveCanvasProject: async (_uid, _cid, patch) => {
          savedCalls.push(patch as Record<string, unknown>);
          return { _id: new ObjectId() } as CanvasProject;
        },
        startCanvasNodeAfterUpstream: async () => ({
          ok: true,
          waitingOn: ["node-1"],
          activeFlowRun: {
            flowRunId: "flow-up",
            status: "running",
            waveIndex: 0,
            waves: [["node-1"], ["node-2"]],
            currentWave: 0,
            totalWaves: 2,
            activeWaveJobIds: ["job-1"],
            failedNodeIds: [],
            startedAt: new Date(),
            updatedAt: new Date(),
          },
        }),
        submitCanvasNodeJob: async () => {
          submitCalled = true;
          throw new Error("should not submit immediately");
        },
        readUserCreditUsd: async () => 8.5,
      },
    );

    assert.equal(savedCalls.length, 1);
    assert.equal(submitCalled, false);
    assert.deepEqual(res, {
      ok: true,
      waitingForUpstream: true,
      activeFlowRun: {
        flowRunId: "flow-up",
        status: "running",
        waveIndex: 0,
        waves: [["node-1"], ["node-2"]],
        currentWave: 0,
        totalWaves: 2,
        activeWaveJobIds: ["job-1"],
        failedNodeIds: [],
        startedAt: res.ok && "waitingForUpstream" in res ? res.activeFlowRun.startedAt : new Date(),
        updatedAt: res.ok && "waitingForUpstream" in res ? res.activeFlowRun.updatedAt : new Date(),
      },
      creditUsd: 8.5,
    });
  });

  it("reads DB jobs directly in worker-queue-only mode and delegates to pollCanvasJobs in local mode", async () => {
    const canvasId = new ObjectId();
    const jobId = new ObjectId();
    const sampleJob: CanvasJob = {
      _id: jobId,
      clerkUserId: "user-1",
      canvasId,
      nodeId: "n1",
      provider: "openrouter",
      modelId: "openrouter:m1",
      providerModelId: "m1",
      status: "running",
      inputSnapshot: {},
      chargedUsd: 0.135,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    let pollExecutorCalled = false;
    const workerRes = await pollCanvasJobsForClient(
      {
        clerkUserId: "user-1",
        canvasId: canvasId.toHexString(),
        jobIds: [jobId.toHexString(), "invalid-id"],
      },
      {
        shouldUseWorkerQueueOnly: () => true,
        findJobsByIds: async () => [sampleJob],
        readUserCreditUsd: async () => 12.25,
        pollCanvasJobs: async () => {
          pollExecutorCalled = true;
          return { jobs: [], creditUsd: 0 };
        },
      },
    );
    assert.equal(pollExecutorCalled, false);
    assert.equal(workerRes.jobs.length, 1);
    assert.equal(workerRes.creditUsd, 12.25);

    const localRes = await pollCanvasJobsForClient(
      {
        clerkUserId: "user-1",
        canvasId: canvasId.toHexString(),
        jobIds: [jobId.toHexString()],
      },
      {
        shouldUseWorkerQueueOnly: () => false,
        pollCanvasJobs: async () => {
          pollExecutorCalled = true;
          return { jobs: [{ ...sampleJob, status: "completed" }], creditUsd: 12.25 };
        },
      },
    );
    assert.equal(pollExecutorCalled, true);
    assert.equal(localRes.jobs[0]?.status, "completed");
  });

  it("steps active flow waves in-process during local dev polling and heals finished runs", async () => {
    const canvasId = new ObjectId();
    const steps: string[] = [];
    const baseProject: CanvasProject = {
      _id: canvasId,
      clerkUserId: "user-1",
      title: "Demo",
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      activeFlowRun: {
        flowRunId: "flow-1",
        status: "running",
        waveIndex: 0,
        waves: [["n1"]],
        currentWave: 0,
        totalWaves: 1,
        activeWaveJobIds: ["job-a"],
        failedNodeIds: [],
        startedAt: new Date(),
        updatedAt: new Date(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const res = await pollCanvasFlowForClient(
      { clerkUserId: "user-1", canvasId: canvasId.toHexString() },
      {
        shouldUseWorkerQueueOnly: () => false,
        findCanvasProject: async () => baseProject,
        pollCanvasJobs: async () => {
          steps.push("poll-wave-jobs");
          return { jobs: [], creditUsd: 5 };
        },
        executeCanvasFlowTask: async () => {
          steps.push("step-flow");
          return { outcome: "completed" };
        },
        healFinishedCanvasRuns: async (_uid, _cid, nodes) => {
          steps.push("heal-nodes");
          return nodes;
        },
        readUserCreditUsd: async () => 5,
      },
    );

    assert.deepEqual(steps, ["poll-wave-jobs", "step-flow", "heal-nodes"]);
    assert.equal(res.creditUsd, 5);
    assert.equal(res.activeFlowRun?.flowRunId, "flow-1");
  });

  it("saves graph snapshot before starting a flow run", async () => {
    let saved = false;
    const res = await runCanvasFlowWithPreSave(
      {
        clerkUserId: "user-1",
        canvasId: new ObjectId().toHexString(),
        nodes: [],
        rerunAll: true,
      },
      {
        saveCanvasProject: async () => {
          saved = true;
          return { _id: new ObjectId() } as CanvasProject;
        },
        startCanvasFlowRun: async () => ({
          ok: true,
          activeFlowRun: {
            flowRunId: "flow-9",
            status: "running",
            waveIndex: 0,
            waves: [["n1"]],
            currentWave: 0,
            totalWaves: 1,
            activeWaveJobIds: [],
            failedNodeIds: [],
            startedAt: new Date(),
            updatedAt: new Date(),
          },
        }),
        readUserCreditUsd: async () => 3.5,
      },
    );

    assert.equal(saved, true);
    assert.equal(res.ok, true);
    if (res.ok) {
      assert.equal(res.creditUsd, 3.5);
      assert.equal(res.activeFlowRun.flowRunId, "flow-9");
    }
  });
});
