// Validates one model card, charges USD Credit, and either queues a worker or dispatches now.
// Callers keep importing submitCanvasNodeJob from "@/service/canvas/execution/executor".

import { ObjectId } from "mongodb";
import type { CanvasJob, CanvasNode, CanvasProject } from "@/model/canvas";
import { markJobQueued } from "@/service/canvas/execution/job-ledger";
import { applyCompletedJobOutputs, resolveNodeInputs } from "@/service/canvas/core/graph";
import { isExplainerPlannerNode } from "@/service/canvas/directors/explainer-planner";
import { isScroDirectorNode } from "@/service/canvas/directors/scro-director";
import { findCanvasModel } from "@/service/canvas/catalog/model-catalog";
import { estimateCanvasModelCostUsd } from "@/service/canvas/catalog/pricing";
import { OPENROUTER_HEYGEN_AVATAR_IV_VIDEO_MODEL } from "@/service/openrouter/generate";
import { probeRemoteDurationSec } from "@/service/canvas/execution/caption-transcribe";
import {
  isInsufficientCreditError,
  resolveDeps,
  toErrorMessage,
  type CanvasExecutorDeps,
  type SubmitCanvasNodeJobInput,
  type SubmitCanvasNodeJobResult,
} from "@/service/canvas/execution/jobs/deps";
import { executeDispatchedCanvasJob } from "@/service/canvas/execution/jobs/dispatch";
import { canvasProviderAdapter } from "@/service/canvas/execution/providers";

// Restores outputUrl from the newest completed job when a stale graph save wiped it.
async function hydrateMissingModelOutputs(
  project: CanvasProject,
  deps: CanvasExecutorDeps,
): Promise<CanvasNode[]> {
  const missingNodeIds = project.nodes
    .filter((item) => item.type === "model" && !item.data.outputUrl?.trim())
    .map((item) => item.id);
  if (missingNodeIds.length === 0) return project.nodes;

  const jobs = await deps.findCompletedJobOutputs(
    project._id,
    project.clerkUserId,
    missingNodeIds,
  );
  const hydrated = applyCompletedJobOutputs(project.nodes, jobs);
  const now = deps.now();
  for (const item of hydrated) {
    if (item.type !== "model" || !item.data.outputUrl) continue;
    const previous = project.nodes.find((node) => node.id === item.id);
    if (!previous || previous.data.outputUrl?.trim()) continue;
    await deps.updateCanvasNodeState({
      canvasId: project._id,
      clerkUserId: project.clerkUserId,
      nodeId: item.id,
      patch: {
        outputUrl: item.data.outputUrl,
        ...(item.data.outputKind ? { outputKind: item.data.outputKind } : {}),
        status: "completed",
        lastError: undefined,
      },
      updatedAt: now,
    });
  }
  return hydrated;
}

// Validates a model node, pre-charges authoritative USD credit, creates a `canvas_jobs`
// record, dispatches to its provider adapter, and auto-refunds on any submit error.
export async function submitCanvasNodeJob(
  input: SubmitCanvasNodeJobInput,
  deps?: Partial<CanvasExecutorDeps>,
): Promise<SubmitCanvasNodeJobResult> {
  const resolved = resolveDeps(deps);

  if (!ObjectId.isValid(input.canvasId)) {
    return { ok: false, code: "NOT_FOUND", error: "找不到畫布專案" };
  }
  const canvasObjectId = new ObjectId(input.canvasId);
  const loadedProject = await resolved.findCanvasProject(
    canvasObjectId,
    input.clerkUserId,
  );
  if (!loadedProject) {
    return { ok: false, code: "NOT_FOUND", error: "找不到畫布專案" };
  }
  const project = loadedProject;

  const node = project.nodes.find((item) => item.id === input.nodeId);
  if (!node || node.type !== "model") {
    return {
      ok: false,
      code: "INVALID_NODE",
      error: "找不到可執行的模型節點",
    };
  }

  const catalog = await resolved.getCatalog();
  const spec = node.data.modelId
    ? findCanvasModel(node.data.modelId, catalog)
    : undefined;
  if (!spec) {
    return {
      ok: false,
      code: "INVALID_MODEL",
      error: `不支援的模型：${node.data.modelId || "(未選擇)"}`,
    };
  }

  if (isExplainerPlannerNode(node) || isScroDirectorNode(node)) {
    return {
      ok: false,
      code: "INVALID_INPUTS",
      error: isScroDirectorNode(node)
        ? "先按建立展開換角或換場，再執行展開後的節點"
        : "解說分鏡規劃完成後會展開成節點，請執行展開後的節點",
    };
  }

  // Verify provider credentials before charging any USD credit.
  const adapter = canvasProviderAdapter(spec.provider);
  const credentialError = adapter?.credentialError?.(spec, resolved);
  if (credentialError) {
    const creditUsd = await resolved.getUserCreditUsd(input.clerkUserId);
    return {
      ok: false,
      code: "PROVIDER_UNAVAILABLE",
      error: credentialError,
      creditUsd,
    };
  }

  const projectNodes = await hydrateMissingModelOutputs(project, resolved);
  const inputCheck = resolveNodeInputs(
    node.id,
    projectNodes,
    project.edges,
    catalog,
  );
  if (!inputCheck.ok) {
    const creditUsd = await resolved.getUserCreditUsd(input.clerkUserId);
    const details: string[] = [];
    if (inputCheck.missingRequiredFields.length > 0) {
      details.push(`缺少必要輸入：${inputCheck.missingRequiredFields.join(", ")}`);
    }
    if (inputCheck.missingUpstreamNodeIds.length > 0) {
      details.push("上游節點尚未產生輸出");
    }
    return {
      ok: false,
      code: "INVALID_INPUTS",
      error: details.join("；") || inputCheck.reason || "節點輸入不完整",
      missingRequiredFields: inputCheck.missingRequiredFields,
      missingUpstreamNodeIds: inputCheck.missingUpstreamNodeIds,
      creditUsd,
    };
  }

  const providerCheck = adapter?.validateInputs?.(spec, node, inputCheck.inputs);
  if (providerCheck && !providerCheck.ok) {
    const creditUsd = await resolved.getUserCreditUsd(input.clerkUserId);
    return {
      ok: false,
      code: "INVALID_INPUTS",
      error: providerCheck.reason,
      missingRequiredFields: providerCheck.missingRequiredFields,
      creditUsd,
    };
  }

  // Recalculate authoritative USD cost server-side before deducting wallet balance.
  const durationPresetSec =
    node.data.toolParams?.durationPreset === "15s"
      ? 15
      : node.data.toolParams?.durationPreset === "30s"
        ? 30
        : node.data.toolParams?.durationPreset === "45s"
          ? 45
          : node.data.toolParams?.durationPreset === "60s"
            ? 60
            : undefined;

  let resolvedDurationSeconds =
    spec.id === "scro:explainer"
      ? durationPresetSec ?? node.data.durationSeconds
      : node.data.durationSeconds ?? durationPresetSec;

  const isHeyGen = spec.providerModelId === OPENROUTER_HEYGEN_AVATAR_IV_VIDEO_MODEL;
  if (spec.id === "scro:talking-head" || isHeyGen) {
    if (inputCheck.inputs.refAudio && resolved.probeAudioDurationSec) {
      const probed = await resolved.probeAudioDurationSec(inputCheck.inputs.refAudio);
      if (probed && Number.isFinite(probed) && probed > 0) {
        resolvedDurationSeconds = Math.min(120, Math.max(5, Math.ceil(probed)));
      }
    } else if (
      !isHeyGen &&
      resolvedDurationSeconds === undefined &&
      inputCheck.inputs.prompt?.trim()
    ) {
      const text = inputCheck.inputs.prompt.trim();
      const cjkChars = (text.match(/[\u4e00-\u9fff]/g) ?? []).length;
      const latinWords = text.replace(/[\u4e00-\u9fff]/g, " ").trim().split(/\s+/).filter(Boolean).length;
      const estimated = Math.ceil(cjkChars / 4 + latinWords / 2.5);
      resolvedDurationSeconds = Math.min(120, Math.max(5, estimated));
    }
  }

  if (
    spec.provider === "google" &&
    spec.category === "video" &&
    inputCheck.inputs.startImage &&
    inputCheck.inputs.endImage
  ) {
    // Omni interpolates two frames for at most 10 seconds.
    resolvedDurationSeconds = Math.min(resolvedDurationSeconds ?? 10, 10);
  }

  if (spec.id === "scro:auto-captions" && inputCheck.inputs.video) {
    const probed = await probeRemoteDurationSec(inputCheck.inputs.video).catch(() => null);
    // A failed probe still bills a short clip so the run is not free.
    resolvedDurationSeconds = probed && probed > 0 ? probed : resolvedDurationSeconds ?? 10;
  }

  const costUsd = estimateCanvasModelCostUsd(spec, {
    durationSeconds: resolvedDurationSeconds,
    resolution: node.data.resolution,
    referenceImages: inputCheck.inputs.refImages?.length,
  });

  let spendEventKey: string | undefined;
  if (costUsd > 0) {
    try {
      spendEventKey = await resolved.consumeCreditUsd(input.clerkUserId, costUsd);
    } catch (error) {
      const availableUsd = await resolved.getUserCreditUsd(input.clerkUserId);
      if (isInsufficientCreditError(error)) {
        return {
          ok: false,
          code: "INSUFFICIENT_CREDIT",
          error: toErrorMessage(error, "USD Credit 餘額不足，無法執行此節點"),
          requiredUsd: costUsd,
          availableUsd,
          creditUsd: availableUsd,
        };
      }
      throw error;
    }
  }

  const jobId = new ObjectId();
  const now = resolved.now();
  const presetId =
    adapter?.presetFromCatalog
      ? node.data.presetId && spec.presets.includes(node.data.presetId)
        ? node.data.presetId
        : spec.defaultPresetId
      : node.data.aspectRatio || node.data.presetId || spec.defaultPresetId;

  const inputSnapshot: Record<string, unknown> = {
    ...(inputCheck.inputs.prompt ? { prompt: inputCheck.inputs.prompt } : {}),
    ...(node.data.negativePrompt?.trim()
      ? { negativePrompt: node.data.negativePrompt.trim() }
      : {}),
    ...(typeof node.data.seed === "number" ? { seed: node.data.seed } : {}),
    ...(node.data.aspectRatio ? { aspectRatio: node.data.aspectRatio } : {}),
    ...(node.data.resolution ? { resolution: node.data.resolution } : {}),
    ...(resolvedDurationSeconds !== undefined
      ? { durationSeconds: resolvedDurationSeconds }
      : {}),
    ...(node.data.toolParams ? { toolParams: node.data.toolParams } : {}),
    ...(inputCheck.inputs.image ? { image: inputCheck.inputs.image } : {}),
    ...(inputCheck.inputs.startImage
      ? { startImage: inputCheck.inputs.startImage }
      : {}),
    ...(inputCheck.inputs.endImage
      ? { endImage: inputCheck.inputs.endImage }
      : {}),
    ...(inputCheck.inputs.refImages.length > 0
      ? { refImages: inputCheck.inputs.refImages }
      : {}),
    ...(inputCheck.inputs.video ? { video: inputCheck.inputs.video } : {}),
    ...(inputCheck.inputs.videos.length > 0
      ? { videos: inputCheck.inputs.videos }
      : {}),
    ...(inputCheck.inputs.refAudio
      ? { refAudio: inputCheck.inputs.refAudio }
      : {}),
    ...(inputCheck.inputs.overlayVideo
      ? { overlayVideo: inputCheck.inputs.overlayVideo }
      : {}),
    ...(inputCheck.inputs.audios?.length ? { audios: inputCheck.inputs.audios } : {}),
    presetId,
  };

  const initialJob: CanvasJob = {
    _id: jobId,
    clerkUserId: input.clerkUserId,
    canvasId: canvasObjectId,
    nodeId: node.id,
    ...(input.flowRunId ? { flowRunId: input.flowRunId } : {}),
    provider: spec.provider,
    modelId: spec.id,
    providerModelId: spec.providerModelId,
    presetId,
    status: "queued",
    inputSnapshot,
    chargedUsd: costUsd,
    ...(spendEventKey ? { spendEventKey } : {}),
    outputKind: spec.output.type,
    createdAt: now,
    updatedAt: now,
  };

  await markJobQueued(initialJob, resolved);

  if (input.queueToWorker) {
    await resolved.enqueueCanvasNodeWorkerTask?.(jobId);
    const creditUsd = await resolved.getUserCreditUsd(input.clerkUserId);
    return { ok: true, job: initialJob, creditUsd };
  }

  return executeDispatchedCanvasJob(
    {
      initialJob,
      spec,
      // Same as the worker path: submit the length that was priced.
      node:
        resolvedDurationSeconds !== undefined
          ? { ...node, data: { ...node.data, durationSeconds: resolvedDurationSeconds } }
          : node,
      inputs: inputCheck.inputs,
      presetId,
    },
    resolved,
  );
}
