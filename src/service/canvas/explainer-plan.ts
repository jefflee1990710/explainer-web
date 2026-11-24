// Canvas Explainer planner: start the free plan and read it back as expandable nodes.

import { ObjectId } from "mongodb";
import { canvasProjectsCollection, videosCollection } from "@/dao";
import type { CanvasEdge, CanvasGroup, CanvasGroupKind, CanvasNode } from "@/model/canvas";
import type { Project } from "@/model/project";
import { buildExplainerExpansion, explainerVoicePreset } from "@/service/canvas/explainer-expand";
import {
  isDirectorPlannerNode,
  readPlannerParams,
  TALKING_HEAD_PLANNER_MODEL_ID,
} from "@/service/canvas/explainer-planner";
import { composeExplainerPlanSource } from "@/service/canvas/explainer-settings";
import type { ExplainerPresenterPosition } from "@/model/explainer-settings";
import {
  directorParams,
  isExplainerDirectorNode,
  readDirectorPlan,
  type ExplainerDirectorParams,
  type ExplainerDirectorPlan,
} from "@/service/canvas/explainer-director";
import { resolveNodeInputs } from "@/service/canvas/graph";
import { defaultGroupColor, defaultGroupTitle, readGroupParams } from "@/service/canvas/groups";
import { getCanvasModelCatalog } from "@/service/canvas/model-catalog";
import { type CanvasPlanFrameInputs, canvasPlanFrameInputs } from "@/service/canvas/plan-frame-inputs";
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
      // Frame around the expanded nodes; its id is the node id prefix.
      group: CanvasGroup;
      // Explainer Director: the plan to store on the node.
      plan?: ExplainerDirectorPlan;
    };

// Plan source for a Director: topic, presenter line, and the old voiceover when the topic is unchanged.
export function explainerPlanSource(node: CanvasNode): string {
  const params = directorParams(node);
  const plan = readDirectorPlan(node);
  const keepNarration = plan !== undefined && plan.plannedWith.topic === params.topic;
  return composeExplainerPlanSource({
    topic: params.topic,
    presenterPosition: params.presenterPosition as ExplainerPresenterPosition,
    narration: keepNarration ? plan.clips.map((c) => c.spokenLine) : [],
  });
}

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
  const director = isExplainerDirectorNode(loaded.node);
  const inputs = director ? { ...resolved.inputs, prompt: explainerPlanSource(loaded.node) } : resolved.inputs;
  try {
    const videoId = await createCanvasDirectorVideo({
      clerkUserId: params.clerkUserId,
      modelId: isTalking ? "scro:talking-head" : "scro:explainer",
      node: loaded.node,
      inputs,
      planOnly: true,
    });
    const plannerVideoId = videoId.toHexString();
    await (await canvasProjectsCollection()).updateOne(
      { _id: loaded.canvas._id, clerkUserId: params.clerkUserId },
      {
        $set: {
          "nodes.$[n].data.toolParams.plannerVideoId": plannerVideoId,
          "nodes.$[n].data.toolParams.planStatus": "planning",
          // The plan records the parameters it started with, even if the card is edited meanwhile.
          ...(director ? { "nodes.$[n].data.toolParams.planningWith": directorParams(loaded.node) } : {}),
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

// Director card width plus a gap; its rows start to the right of it.
const DIRECTOR_ROW_OFFSET_X = 360;

function plannerLanguage(raw: unknown): "yue" | "zh" | "en" {
  return raw === "zh" || raw === "en" ? raw : "yue";
}

// Group for an expanded plan, keeping the planner card's settings for a later replace.
function planGroup(params: {
  id: string;
  kind: CanvasGroupKind;
  title: string | undefined;
  plannerNode: CanvasNode;
  memberIds: string[];
  language: string;
  framing?: string;
}): CanvasGroup {
  return {
    id: params.id,
    title: defaultGroupTitle(params.kind, params.title),
    color: defaultGroupColor(params.kind),
    kind: params.kind,
    memberIds: params.memberIds,
    params: {
      ...readGroupParams([params.plannerNode]),
      aspectRatio: params.plannerNode.data.aspectRatio ?? "9:16",
      language: params.language,
      ...(params.framing ? { framing: params.framing } : {}),
    },
  };
}

// Pure: maps the backing video to planning / failed / ready (with the expanded nodes).
export function planStateFromVideo(params: {
  video: Project | null;
  blocker: string | null;
  plannerNode: CanvasNode;
  buildFramePrompt: (project: Project, clipNumber: number) => string;
  frameInputs?: CanvasPlanFrameInputs;
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
      aspectRatio: plannerNode.data.aspectRatio ?? "9:16",
      frameResolution: params.frameInputs?.resolution,
      language,
      characterId,
      voicePreset,
      framing: video.talkingHeadPoseId ?? "collarbone-close",
      framePrompt: frameByClip.get(1) || params.buildFramePrompt(video, 1),
      frameRefUrls: params.frameInputs?.refsByClip.get(1),
      clips: phaseA.clips.map((clip) => ({
        clipNumber: clip.clipNumber,
        spokenLine: clip.englishVo ?? "",
        heygenPrompt: promptByClip.get(clip.clipNumber)?.prompt ?? "",
        durationSeconds: promptByClip.get(clip.clipNumber)?.durationSeconds ?? clip.durationSeconds,
      })),
    });
    const group = planGroup({
      id: params.idPrefix,
      kind: "talking-head",
      title: phaseA.localizedTitle || phaseA.englishTitle,
      plannerNode,
      memberIds: expansion.nodes.map((n) => n.id),
      language,
      framing: video.talkingHeadPoseId ?? "collarbone-close",
    });
    return { status: "ready", ...expansion, summary, group };
  }

  // Every Explainer planner is a Director; its outputs feed the rows.
  const directorId = plannerNode.id;
  const clips = phaseA.clips.map((clip) => ({
    clipNumber: clip.clipNumber,
    framePrompt: frameByClip.get(clip.clipNumber) || params.buildFramePrompt(video, clip.clipNumber),
    videoPrompt: promptByClip.get(clip.clipNumber)?.prompt ?? "",
    durationSeconds: promptByClip.get(clip.clipNumber)?.durationSeconds ?? clip.durationSeconds,
    spokenLine: clip.englishVo ?? "",
    refUrls: params.frameInputs?.refsByClip.get(clip.clipNumber) ?? [],
  }));
  const expansion = buildExplainerExpansion({
    idPrefix: params.idPrefix,
    // Rows sit to the right of the Director, which stays where it is.
    origin: { x: plannerNode.position.x + DIRECTOR_ROW_OFFSET_X, y: plannerNode.position.y },
    aspectRatio: plannerNode.data.aspectRatio ?? "9:16",
    frameResolution: params.frameInputs?.resolution,
    language,
    voicePreset,
    characterId,
    directorId,
    clips,
  });
  const plannedWith =
    (plannerNode.data.toolParams?.planningWith as ExplainerDirectorParams | undefined) ??
    directorParams(plannerNode);
  const plan: ExplainerDirectorPlan = { plannerVideoId: video._id.toHexString(), plannedWith, clips };
  const group = planGroup({
    id: params.idPrefix,
    kind: "explainer",
    title: phaseA.localizedTitle || phaseA.englishTitle,
    plannerNode,
    memberIds: [directorId, ...expansion.nodes.map((n) => n.id)],
    language,
  });
  return { status: "ready", ...expansion, summary, group, plan };
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
  // Locks exist once the blocker clears; read them for the reference image nodes.
  const frameInputs =
    video?.phaseA && ready && !blocker
      ? await canvasPlanFrameInputs(
          video,
          video.phaseA.clips.map((clip) => clip.clipNumber),
        )
      : undefined;
  return planStateFromVideo({
    video,
    blocker,
    frameInputs,
    plannerNode: loaded.node,
    buildFramePrompt: (project, clipNumber) => buildFramePrompt(project, clipNumber, "start"),
    idPrefix: `${loaded.node.data.modelId === TALKING_HEAD_PLANNER_MODEL_ID ? "th" : "exp"}-${plannerVideoId.slice(-6)}`,
  });
}
