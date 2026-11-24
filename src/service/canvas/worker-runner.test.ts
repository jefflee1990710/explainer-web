import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ObjectId } from "mongodb";
import type { CanvasFlowRunState, CanvasJob, CanvasNode, CanvasProject } from "@/model/canvas";
import type { WorkerTask } from "@/model/worker-task";
import { UPSTREAM_FAILED_ERROR } from "@/service/canvas/orphan-busy";
import {
  busyUpstreamModelIds,
  executeCanvasFlowTask,
  executeCanvasNodeTask,
  filterFlowWaves,
  startCanvasNodeAfterUpstream,
  startCanvasFlowRun,
  stopCanvasFlowRun,
} from "@/service/canvas/worker-runner";

function makeProject(nodes: CanvasNode[], edges: CanvasProject["edges"] = []): CanvasProject {
  const now = new Date("2026-11-20T00:00:00.000Z");
  return {
    _id: new ObjectId(),
    clerkUserId: "user-1",
    title: "Worker Canvas",
    viewport: { x: 0, y: 0, zoom: 1 },
    nodes,
    edges,
    createdAt: now,
    updatedAt: now,
  };
}

describe("canvas worker runner — single node", () => {
  it("dispatches queued job and requeues when provider is async running, then completes on poll", async () => {
    const project = makeProject([
      {
        id: "vid",
        type: "model",
        position: { x: 0, y: 0 },
        data: { modelId: "openrouter:minimax/hailuo-3", prompt: "Cat running" },
      },
    ]);
    const job: CanvasJob = {
      _id: new ObjectId(),
      clerkUserId: "user-1",
      canvasId: project._id,
      nodeId: "vid",
      provider: "openrouter",
      modelId: "openrouter:minimax/hailuo-3",
      providerModelId: "minimax/hailuo-3",
      status: "queued",
      inputSnapshot: { prompt: "Cat running" },
      chargedUsd: 0.5,
      outputKind: "video",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const first = await executeCanvasNodeTask(job._id, {
      findCanvasJob: async () => ({ ...job }),
      dispatchQueuedJob: async () => {
        job.status = "running";
        job.externalJobId = "or-123";
        return { ...job };
      },
      pollRunningJob: async () => ({ ...job }),
      runFfmpegJob: async () => ({ outcome: "completed", outputUrl: "" }),
    });
    assert.equal(first.outcome, "requeue");

    const second = await executeCanvasNodeTask(job._id, {
      findCanvasJob: async () => ({ ...job }),
      dispatchQueuedJob: async () => ({ ...job }),
      pollRunningJob: async () => ({
        ...job,
        status: "completed",
        outputUrl: "https://blob.example/cat.mp4",
      }),
      runFfmpegJob: async () => ({ outcome: "completed", outputUrl: "" }),
    });
    assert.equal(second.outcome, "completed");
    if (second.outcome === "completed") {
      assert.equal(second.outputUrl, "https://blob.example/cat.mp4");
    }
  });

  it("executes ffmpeg:* jobs directly inside canvas_node worker task", async () => {
    const jobId = new ObjectId();
    const ffJob: CanvasJob = {
      _id: jobId,
      clerkUserId: "user-1",
      canvasId: new ObjectId(),
      nodeId: "ff",
      provider: "ffmpeg",
      modelId: "ffmpeg:concat",
      providerModelId: "concat",
      status: "queued",
      domainKind: "worker_ffmpeg",
      inputSnapshot: { videos: ["https://blob.example/1.mp4"] },
      chargedUsd: 0,
      outputKind: "video",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const res = await executeCanvasNodeTask(jobId, {
      findCanvasJob: async () => ({ ...ffJob }),
      dispatchQueuedJob: async () => ({ ...ffJob }),
      pollRunningJob: async () => ({ ...ffJob }),
      runFfmpegJob: async () => ({
        outcome: "completed",
        outputUrl: "https://blob.example/concat.mp4",
      }),
    });
    assert.equal(res.outcome, "completed");
    if (res.outcome === "completed") {
      assert.equal(res.outputUrl, "https://blob.example/concat.mp4");
    }
  });
});

describe("canvas worker runner — multi-wave flow", () => {
  it("runs wave 1, requeues until wave 1 finishes, then runs wave 2 and finishes flow", async () => {
    const project = makeProject(
      [
        {
          id: "img",
          type: "model",
          position: { x: 0, y: 0 },
          data: { modelId: "openrouter:bytedance-seed/seedream-5-0-pro", prompt: "Fox" },
        },
        {
          id: "vid",
          type: "model",
          position: { x: 300, y: 0 },
          data: { modelId: "openrouter:minimax/hailuo-3", prompt: "Fox moves" },
        },
      ],
      [
        {
          id: "e1",
          source: "img",
          sourceHandle: "output",
          target: "vid",
          targetHandle: "startImage",
        },
      ],
    );

    const job1Id = new ObjectId();
    const job2Id = new ObjectId();
    const jobs = new Map<string, CanvasJob>();
    let scheduledFlow = false;

    const flowDeps = {
      findCanvasProject: async () => ({ ...project }),
      setActiveFlowRun: async (_id: ObjectId, _uid: string, run: CanvasFlowRunState) => {
        project.activeFlowRun = run;
      },
      scheduleFlowTask: () => {
        scheduledFlow = true;
      },
      submitNodeQueued: async ({ nodeId }: { nodeId: string }) => {
        const jId = nodeId === "img" ? job1Id : job2Id;
        const job: CanvasJob = {
          _id: jId,
          clerkUserId: "user-1",
          canvasId: project._id,
          nodeId,
          provider: "openrouter",
          modelId: nodeId === "img" ? "openrouter:bytedance-seed/seedream-5-0-pro" : "openrouter:minimax/hailuo-3",
          providerModelId: nodeId === "img" ? "seedream-5-0-pro" : "minimax/hailuo-3",
          status: "queued",
          inputSnapshot: {},
          chargedUsd: 0.15,
          outputKind: nodeId === "img" ? "image" : "video",
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        jobs.set(jId.toHexString(), job);
        return { ok: true as const, job, creditUsd: 9 };
      },
      findCanvasJobsByIds: async (_cid: ObjectId, _uid: string, ids: ObjectId[]) =>
        ids.map((id) => jobs.get(id.toHexString())!).filter(Boolean),
      claimFlowStep: async () => true,
    };

    const startRes = await startCanvasFlowRun(
      { clerkUserId: "user-1", canvasId: project._id.toHexString() },
      flowDeps,
    );
    assert.equal(startRes.ok, true);
    assert.equal(scheduledFlow, true);
    assert.deepEqual(project.activeFlowRun?.waves, [["img"], ["vid"]]);

    const task: WorkerTask = {
      _id: new ObjectId(),
      kind: "canvas_flow",
      lane: "cpu",
      status: "in_progress",
      targetId: project._id.toHexString(),
      payload: { flowRunId: project.activeFlowRun!.flowRunId, clerkUserId: "user-1" },
      attempts: 1,
      maxAttempts: 5,
      nextAttemptAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Wave 1 starts `img` -> requeues
    const step1 = await executeCanvasFlowTask(task, flowDeps);
    assert.equal(step1.outcome, "requeue");
    assert.deepEqual(project.activeFlowRun?.activeWaveJobIds, [job1Id.toHexString()]);

    // Complete Wave 1 job
    jobs.get(job1Id.toHexString())!.status = "completed";
    project.nodes[0]!.data.status = "completed";
    project.nodes[0]!.data.outputUrl = "https://blob.example/fox.png";

    // Wave 1 done -> submits Wave 2 `vid` -> requeues
    const step2 = await executeCanvasFlowTask(task, flowDeps);
    assert.equal(step2.outcome, "requeue");
    assert.equal(project.activeFlowRun?.currentWave, 2);
    assert.deepEqual(project.activeFlowRun?.activeWaveJobIds, [job2Id.toHexString()]);

    // Complete Wave 2 job -> flow completes
    jobs.get(job2Id.toHexString())!.status = "completed";
    const step3 = await executeCanvasFlowTask(task, flowDeps);
    assert.equal(step3.outcome, "completed");
    assert.equal(project.activeFlowRun?.status, "completed");
  });

  it("reuses a current completed node but regenerates one marked as an old version", async () => {
    const done = (id: string) => ({ status: "completed" as const, outputUrl: `https://blob.example/${id}` });
    const project = makeProject(
      [
        { id: "a", type: "model", position: { x: 0, y: 0 }, data: { modelId: "scro:tts", prompt: "hi", ...done("a") } },
        {
          id: "b",
          type: "model",
          position: { x: 300, y: 0 },
          data: { modelId: "scro:tts", prompt: "yo", ...done("b"), staleOutputUrl: "https://blob.example/b" },
        },
      ],
      [],
    );
    const submitted: string[] = [];
    const flowDeps = {
      findCanvasProject: async () => ({ ...project }),
      setActiveFlowRun: async (_id: ObjectId, _uid: string, run: CanvasFlowRunState) => {
        project.activeFlowRun = run;
      },
      scheduleFlowTask: () => {},
      submitNodeQueued: async ({ nodeId }: { nodeId: string }) => {
        submitted.push(nodeId);
        const job = {
          _id: new ObjectId(),
          clerkUserId: "user-1",
          canvasId: project._id,
          nodeId,
          provider: "openrouter",
          modelId: "scro:tts",
          providerModelId: "tts",
          status: "queued",
          inputSnapshot: {},
          chargedUsd: 0.02,
          outputKind: "audio",
          createdAt: new Date(),
          updatedAt: new Date(),
        } as CanvasJob;
        return { ok: true as const, job, creditUsd: 9 };
      },
      findCanvasJobsByIds: async () => [],
      claimFlowStep: async () => true,
    };
    await startCanvasFlowRun({ clerkUserId: "user-1", canvasId: project._id.toHexString() }, flowDeps);
    await executeCanvasFlowTask(
      {
        _id: new ObjectId(),
        kind: "canvas_flow",
        lane: "cpu",
        status: "in_progress",
        targetId: project._id.toHexString(),
        payload: { flowRunId: project.activeFlowRun!.flowRunId, clerkUserId: "user-1" },
        attempts: 1,
        maxAttempts: 5,
        nextAttemptAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      flowDeps,
    );
    assert.deepEqual(submitted, ["b"]);
  });

  it("halts gracefully when stopCanvasFlowRun sets aborted = true", async () => {
    const project = makeProject([
      {
        id: "img",
        type: "model",
        position: { x: 0, y: 0 },
        data: { modelId: "openrouter:bytedance-seed/seedream-5-0-pro", prompt: "Fox" },
      },
    ]);
    project.activeFlowRun = {
      flowRunId: "flow-1",
      status: "running",
      currentWave: 1,
      totalWaves: 1,
      waveIndex: 0,
      waves: [["img"]],
      activeWaveJobIds: [],
      failedNodeIds: [],
      aborted: false,
      startedAt: new Date(),
      updatedAt: new Date(),
    };

    await stopCanvasFlowRun(
      { clerkUserId: "user-1", canvasId: project._id.toHexString() },
      {
        abortFlowRun: async () => {
          project.activeFlowRun!.aborted = true;
          project.activeFlowRun!.status = "stopped";
        },
      },
    );

    const res = await executeCanvasFlowTask(
      {
        _id: new ObjectId(),
        kind: "canvas_flow",
        lane: "cpu",
        status: "in_progress",
        targetId: project._id.toHexString(),
        payload: { flowRunId: "flow-1", clerkUserId: "user-1" },
        attempts: 1,
        maxAttempts: 5,
        nextAttemptAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        findCanvasProject: async () => ({ ...project }),
        setActiveFlowRun: async (_id, _uid, run) => {
          project.activeFlowRun = run;
        },
      },
    );
    assert.equal(res.outcome, "completed");
    if (res.outcome === "completed") {
      assert.equal(res.stage, "flow_aborted");
    }
  });

  it("writes node failed status & lastError when submitNodeQueued fails inside executeCanvasFlowTask", async () => {
    const project = makeProject([
      {
        id: "img",
        type: "model",
        position: { x: 0, y: 0 },
        data: { modelId: "openrouter:bytedance-seed/seedream-5-0-pro", prompt: "Fox" },
      },
    ]);
    project.activeFlowRun = {
      flowRunId: "flow-fail",
      status: "running",
      currentWave: 1,
      totalWaves: 1,
      waveIndex: 0,
      waves: [["img"]],
      activeWaveJobIds: [],
      failedNodeIds: [],
      aborted: false,
      startedAt: new Date(),
      updatedAt: new Date(),
    };

    const markedFailed: Array<{ nodeId: string; error: string }> = [];
    const res = await executeCanvasFlowTask(
      {
        _id: new ObjectId(),
        kind: "canvas_flow",
        lane: "cpu",
        status: "in_progress",
        targetId: project._id.toHexString(),
        payload: { flowRunId: "flow-fail", clerkUserId: "user-1" },
        attempts: 1,
        maxAttempts: 5,
        nextAttemptAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        findCanvasProject: async () => ({ ...project }),
        setActiveFlowRun: async (_id, _uid, run) => {
          project.activeFlowRun = run;
        },
        submitNodeQueued: async () => ({
          ok: false,
          error: "USD Credit 餘額不足",
        }),
        markNodeFailed: async (_cid, _uid, nodeId, error) => {
          markedFailed.push({ nodeId, error });
        },
        claimFlowStep: async () => true,
      },
    );
    assert.equal(res.outcome, "completed");
    assert.equal(project.activeFlowRun?.status, "failed");
    assert.deepEqual(markedFailed, [{ nodeId: "img", error: "USD Credit 餘額不足" }]);
  });

  it("marks a node failed when an upstream node failed, so it does not stay queued", async () => {
    const project = makeProject(
      [
        { id: "vid", type: "model", position: { x: 0, y: 0 }, data: { modelId: "openrouter:minimax/hailuo-3" } },
        { id: "concat", type: "model", position: { x: 300, y: 0 }, data: { modelId: "ffmpeg:concat", status: "queued" } },
      ],
      [{ id: "e1", source: "vid", sourceHandle: "output", target: "concat", targetHandle: "videos" }],
    );
    project.activeFlowRun = {
      flowRunId: "flow-up",
      status: "running",
      currentWave: 2,
      totalWaves: 2,
      waveIndex: 1,
      waves: [["vid"], ["concat"]],
      activeWaveJobIds: [],
      failedNodeIds: ["vid"],
      aborted: false,
      startedAt: new Date(),
      updatedAt: new Date(),
    };
    const markedFailed: Array<{ nodeId: string; error: string }> = [];
    const res = await executeCanvasFlowTask(
      {
        _id: new ObjectId(),
        kind: "canvas_flow",
        lane: "cpu",
        status: "in_progress",
        targetId: project._id.toHexString(),
        payload: { flowRunId: "flow-up", clerkUserId: "user-1" },
        attempts: 1,
        maxAttempts: 5,
        nextAttemptAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        findCanvasProject: async () => ({ ...project }),
        setActiveFlowRun: async (_id, _uid, run) => {
          project.activeFlowRun = run;
        },
        markNodeFailed: async (_cid, _uid, nodeId, error) => {
          markedFailed.push({ nodeId, error });
        },
        claimFlowStep: async () => true,
      },
    );
    assert.equal(res.outcome, "completed");
    assert.equal(project.activeFlowRun?.status, "failed");
    assert.deepEqual(markedFailed, [{ nodeId: "concat", error: UPSTREAM_FAILED_ERROR }]);
  });

  it("does not submit a wave while another step holds the flow lock", async () => {
    const project = makeProject([
      {
        id: "img",
        type: "model",
        position: { x: 0, y: 0 },
        data: { modelId: "openrouter:bytedance-seed/seedream-5-0-pro", prompt: "Fox" },
      },
    ]);
    project.activeFlowRun = {
      flowRunId: "flow-lock",
      status: "running",
      currentWave: 1,
      totalWaves: 1,
      waveIndex: 0,
      waves: [["img"]],
      activeWaveJobIds: [],
      failedNodeIds: [],
      aborted: false,
      startedAt: new Date(),
      updatedAt: new Date(),
    };
    let submitted = 0;
    const res = await executeCanvasFlowTask(
      {
        _id: new ObjectId(),
        kind: "canvas_flow",
        lane: "cpu",
        status: "in_progress",
        targetId: project._id.toHexString(),
        payload: { flowRunId: "flow-lock", clerkUserId: "user-1" },
        attempts: 1,
        maxAttempts: 5,
        nextAttemptAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        findCanvasProject: async () => ({ ...project }),
        claimFlowStep: async () => false,
        submitNodeQueued: async () => {
          submitted += 1;
          return { ok: false, error: "should not submit" };
        },
      },
    );
    assert.equal(res.outcome, "requeue");
    if (res.outcome === "requeue") assert.equal(res.stage, "flow_locked");
    assert.equal(submitted, 0);
    assert.equal(project.activeFlowRun?.status, "running");
  });
});

describe("waiting for a running upstream node", () => {
  const nodes: CanvasNode[] = [
    { id: "img", type: "model", position: { x: 0, y: 0 }, data: { modelId: "openrouter:img", status: "running", lastJobId: "" } },
    { id: "done", type: "model", position: { x: 0, y: 0 }, data: { modelId: "openrouter:img", status: "completed" } },
    { id: "vid", type: "model", position: { x: 0, y: 0 }, data: { modelId: "openrouter:minimax/hailuo-3" } },
  ];
  const edges = [
    { id: "e1", source: "img", sourceHandle: "output", target: "vid", targetHandle: "startImage" },
    { id: "e2", source: "done", sourceHandle: "output", target: "vid", targetHandle: "endImage" },
  ];

  it("lists only wired upstream model nodes that are still busy", () => {
    assert.deepEqual(busyUpstreamModelIds(nodes, edges, "vid"), ["img"]);
    assert.deepEqual(busyUpstreamModelIds(nodes, edges, "img"), []);
  });

  it("watches the upstream job already running instead of submitting it again, then runs the target", async () => {
    const upstreamJobId = new ObjectId();
    const project = makeProject(
      [
        { ...nodes[0]!, data: { ...nodes[0]!.data, lastJobId: upstreamJobId.toHexString() } },
        nodes[1]!,
        nodes[2]!,
      ],
      edges,
    );
    const jobs = new Map<string, CanvasJob>();
    jobs.set(upstreamJobId.toHexString(), {
      _id: upstreamJobId,
      clerkUserId: "user-1",
      canvasId: project._id,
      nodeId: "img",
      provider: "openrouter",
      modelId: "openrouter:img",
      providerModelId: "img",
      status: "running",
      inputSnapshot: {},
      chargedUsd: 0.1,
      outputKind: "image",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const submitted: string[] = [];
    const queued: string[] = [];
    const deps = {
      findCanvasProject: async () => ({ ...project }),
      setActiveFlowRun: async (_id: ObjectId, _uid: string, run: CanvasFlowRunState) => {
        project.activeFlowRun = run;
      },
      scheduleFlowTask: () => {},
      markNodeQueued: async (_cid: ObjectId, _uid: string, nodeId: string) => {
        queued.push(nodeId);
      },
      submitNodeQueued: async ({ nodeId }: { nodeId: string }) => {
        submitted.push(nodeId);
        const job = { ...jobs.get(upstreamJobId.toHexString())!, _id: new ObjectId(), nodeId, status: "queued" as const };
        jobs.set(job._id.toHexString(), job);
        return { ok: true as const, job, creditUsd: 9 };
      },
      findCanvasJobsByIds: async (_cid: ObjectId, _uid: string, ids: ObjectId[]) =>
        ids.map((id) => jobs.get(id.toHexString())!).filter(Boolean),
      claimFlowStep: async () => true,
    };

    const started = await startCanvasNodeAfterUpstream(
      { clerkUserId: "user-1", canvasId: project._id.toHexString(), nodeId: "vid" },
      deps,
    );
    assert.ok(started && started.ok);
    assert.deepEqual(started.waitingOn, ["img"]);
    assert.deepEqual(queued, ["vid"]);
    assert.deepEqual(project.activeFlowRun?.waves, [["img"], ["vid"]]);

    const task: WorkerTask = {
      _id: new ObjectId(),
      kind: "canvas_flow",
      lane: "cpu",
      status: "in_progress",
      targetId: project._id.toHexString(),
      payload: { flowRunId: project.activeFlowRun!.flowRunId, clerkUserId: "user-1" },
      attempts: 1,
      maxAttempts: 5,
      nextAttemptAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await executeCanvasFlowTask(task, deps);
    assert.deepEqual(submitted, []);
    assert.deepEqual(project.activeFlowRun?.activeWaveJobIds, [upstreamJobId.toHexString()]);

    jobs.get(upstreamJobId.toHexString())!.status = "completed";
    project.nodes[0]!.data.status = "completed";
    project.nodes[0]!.data.outputUrl = "https://blob.example/img.png";
    await executeCanvasFlowTask(task, deps);
    assert.deepEqual(submitted, ["vid"]);
  });

  it("returns null when nothing upstream is running", async () => {
    const project = makeProject([nodes[1]!, nodes[2]!], [edges[1]!]);
    const res = await startCanvasNodeAfterUpstream(
      { clerkUserId: "user-1", canvasId: project._id.toHexString(), nodeId: "vid" },
      { findCanvasProject: async () => ({ ...project }) },
    );
    assert.equal(res, null);
  });
});

describe("filterFlowWaves", () => {
  it("keeps only group members and drops empty waves", () => {
    assert.deepEqual(
      filterFlowWaves([["a", "x"], ["y"], ["b"]], ["a", "b"]),
      [["a"], ["b"]],
    );
  });
});
