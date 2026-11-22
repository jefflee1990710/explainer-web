// Canvas Explainer planner: start the free plan and read it back as expandable nodes.

import { ObjectId } from "mongodb";
import { canvasProjectsCollection, videosCollection } from "@/dao";
import type { CanvasEdge, CanvasNode } from "@/model/canvas";
import type { Project } from "@/model/project";
import { buildExplainerExpansion, explainerVoicePreset } from "@/service/canvas/explainer-expand";
import {
  isDirectorPlannerNode,
  readPlannerParams,
  TALKING_HEAD_PLANNER_MODEL_ID,
} from "@/service/canvas/explainer-planner";
import { resolveNodeInputs } from "@/service/canvas/graph";
import { getCanvasModelCatalog } from "@/service/canvas/model-catalog";
import { buildTalkingHeadExpansion } from "@/service/canvas/scro-groups/talking-head";
import { createCanvasDirectorVideo } from "@/service/canvas/scro-dispatch";
import { buildFramePrompt } from "@/service/higgsfield/frame-prompts";
import { stillBlocker } from "@/service/higgsfield/pipeline";
import { schedulePhaseAWorkerTask } from "@/service/worker/schedule";

export type CanvasExplainerPlanState =
  | { status: "planning" }
  | { status: "failed"; error: string }
  | {
      status: "ready";
      nodes: CanvasNode[];
      edges: CanvasEdge[];
      expandedNodeIds: string[];
      summary: string;
    };

async function loadPlanner(clerkUserId: string, canvasId: string, nodeId: string) {
  if (!ObjectId.isValid(canvasId)) return null;
  const canvas = await (await canvasProjectsCollection()).findOne({
    _id: new ObjectId(canvasId),
    clerkUserId,
  });
  const node = canvas?.nodes.find((n) => n.id === nodeId);
  return canvas && node && isDirectorPlannerNode(node) ? { canvas, node } : null;
}

// Creates a plan-only backing video and queues Phase A on the worker. Free: nothing is charged.
export async function startCanvasExplainerPlan(params: {
  clerkUserId: string;
  canvasId: string;
  nodeId: string;
}): Promise<{ ok: true; plannerVideoId: string } | { ok: false; error: string }> {
  const loaded = await loadPlanner(params.clerkUserId, params.canvasId, params.nodeId);
  if (!loaded) return { ok: false, error: "找不到分鏡規劃節點" };
  const catalog = await getCanvasModelCatalog();
  const resolved = resolveNodeInputs(
    params.nodeId,
    loaded.canvas.nodes,
    loaded.canvas.edges,
    catalog,
  );
  const isTalking = loaded.node.data.modelId === TALKING_HEAD_PLANNER_MODEL_ID;
  if (!resolved.inputs.prompt?.trim()) {
    return { ok: false, error: isTalking ? "請先輸入講稿" : "請先輸入或連接解說主題" };
  }
  try {
    const videoId = await createCanvasDirectorVideo({
      clerkUserId: params.clerkUserId,
      modelId: isTalking ? "scro:talking-head" : "scro:explainer",
      node: loaded.node,
      inputs: resolved.inputs,
      planOnly: true,
    });
    const plannerVideoId = videoId.toHexString();
    await (await canvasProjectsCollection()).updateOne(
      { _id: loaded.canvas._id, clerkUserId: params.clerkUserId },
      {
        $set: {
          "nodes.$[n].data.toolParams.plannerVideoId": plannerVideoId,
          "nodes.$[n].data.toolParams.planStatus": "planning",
          updatedAt: new Date(),
        },
        $unset: { "nodes.$[n].data.toolParams.planError": "" },
      },
      { arrayFilters: [{ "n.id": params.nodeId }] },
    );
    schedulePhaseAWorkerTask(videoId);
    return { ok: true, plannerVideoId };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "分鏡規劃失敗" };
  }
}

function plannerLanguage(raw: unknown): "yue" | "zh" | "en" {
  return raw === "zh" || raw === "en" ? raw : "yue";
}

// Pure: maps the backing video to planning / failed / ready (with the expanded nodes).
export function planStateFromVideo(params: {
  video: Project | null;
  blocker: string | null;
  plannerNode: CanvasNode;
  buildFramePrompt: (project: Project, clipNumber: number) => string;
  idPrefix: string;
}): CanvasExplainerPlanState {
  const { video, plannerNode } = params;
  if (!video) return { status: "failed", error: "找不到這次的分鏡規劃" };
  if (video.status === "failed") return { status: "failed", error: video.error || "分鏡規劃失敗" };
  if (video.canvasPlan?.error) return { status: "failed", error: video.canvasPlan.error };
  const prompts = video.canvasPlan?.prompts ?? [];
  if (video.status !== "production" || !video.phaseA || prompts.length === 0 || params.blocker) {
    return { status: "planning" };
  }
  const toolParams = plannerNode.data.toolParams ?? {};
  const language = plannerLanguage(video.language ?? toolParams.language);
  const characterId =
    typeof toolParams.characterId === "string" && toolParams.characterId
      ? toolParams.characterId
      : undefined;
  const promptByClip = new Map(prompts.map((p) => [p.clipNumber, p]));
  const frameByClip = new Map(
    (video.canvasPlan?.framePrompts ?? []).map((f) => [f.clipNumber, f.prompt]),
  );
  const phaseA = video.phaseA;
  const voicePreset = explainerVoicePreset(language, video.voiceGender === "male" ? "male" : "female");
  const summary = [
    phaseA.localizedTitle || phaseA.englishTitle,
    ...phaseA.clips.map((clip) => `${clip.clipNumber}. ${clip.englishVo}`),
  ]
    .filter(Boolean)
    .join("\n");

  if (plannerNode.data.modelId === TALKING_HEAD_PLANNER_MODEL_ID) {
    const expansion = buildTalkingHeadExpansion({
      idPrefix: params.idPrefix,
      origin: plannerNode.position,
      plannerVideoId: video._id.toHexString(),
      aspectRatio: plannerNode.data.aspectRatio ?? "9:16",
      language,
      characterId,
      voicePreset,
      framing: video.talkingHeadPoseId ?? "collarbone-close",
      framePrompt: frameByClip.get(1) || params.buildFramePrompt(video, 1),
      clips: phaseA.clips.map((clip) => ({
        clipNumber: clip.clipNumber,
        spokenLine: clip.englishVo ?? "",
        heygenPrompt: promptByClip.get(clip.clipNumber)?.prompt ?? "",
        durationSeconds: promptByClip.get(clip.clipNumber)?.durationSeconds ?? clip.durationSeconds,
      })),
    });
    return { status: "ready", ...expansion, summary };
  }

  const expansion = buildExplainerExpansion({
    idPrefix: params.idPrefix,
    origin: plannerNode.position,
    plannerVideoId: video._id.toHexString(),
    aspectRatio: plannerNode.data.aspectRatio ?? "9:16",
    language,
    voicePreset,
    characterId,
    clips: phaseA.clips.map((clip) => ({
      clipNumber: clip.clipNumber,
      framePrompt:
        frameByClip.get(clip.clipNumber) || params.buildFramePrompt(video, clip.clipNumber),
      videoPrompt: promptByClip.get(clip.clipNumber)?.prompt ?? "",
      durationSeconds:
        promptByClip.get(clip.clipNumber)?.durationSeconds ?? clip.durationSeconds,
      spokenLine: clip.englishVo ?? "",
    })),
  });
  return { status: "ready", ...expansion, summary };
}

export async function readCanvasExplainerPlan(params: {
  clerkUserId: string;
  canvasId: string;
  nodeId: string;
}): Promise<CanvasExplainerPlanState> {
  const loaded = await loadPlanner(params.clerkUserId, params.canvasId, params.nodeId);
  if (!loaded) return { status: "failed", error: "找不到分鏡規劃節點" };
  const { plannerVideoId } = readPlannerParams(loaded.node);
  if (!plannerVideoId || !ObjectId.isValid(plannerVideoId)) {
    return { status: "failed", error: "尚未開始規劃" };
  }
  const video = await (await videosCollection()).findOne({
    _id: new ObjectId(plannerVideoId),
    clerkUserId: params.clerkUserId,
  });
  // Lock check only once prompts exist; it may submit the character still.
  const ready = Boolean(video?.canvasPlan?.prompts?.length) && video?.status === "production";
  const blocker = video && ready ? await stillBlocker(video) : null;
  return planStateFromVideo({
    video,
    blocker,
    plannerNode: loaded.node,
    buildFramePrompt: (project, clipNumber) => buildFramePrompt(project, clipNumber, "start"),
    idPrefix: `${loaded.node.data.modelId === TALKING_HEAD_PLANNER_MODEL_ID ? "th" : "exp"}-${plannerVideoId.slice(-6)}`,
  });
}
