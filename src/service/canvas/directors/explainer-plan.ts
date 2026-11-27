// Canvas Explainer planner: start the free plan and read it back as expandable nodes.

import { ObjectId } from "mongodb";
import { canvasProjectsCollection, videosCollection } from "@/dao";
import type { CanvasEdge, CanvasGroup, CanvasGroupKind, CanvasNode } from "@/model/canvas";
import type { Project } from "@/model/project";
import { buildExplainerExpansion, explainerVoicePreset } from "@/service/canvas/directors/explainer-expand";
import { readClipJoin } from "@/service/canvas/scro-groups/clip-join";
import {
  isDirectorPlannerNode,
  readPlannerParams,
  TALKING_HEAD_PLANNER_MODEL_ID,
} from "@/service/canvas/directors/explainer-planner";
import { composeExplainerPlanSource } from "@/service/canvas/directors/explainer-settings";
import type { ExplainerPresenterPosition } from "@/model/explainer-settings";
import {
  directorHandles,
  directorNodeWithWiredPrompt,
  directorParams,
  explainerNodeWithWiredTopic,
  isExplainerDirectorNode,
  isPlanDirectorNode,
  planDirectorParams,
  readDirectorPlan,
  type DirectorPlanParams,
  type ExplainerDirectorParams,
  type ExplainerDirectorPlan,
} from "@/service/canvas/directors/explainer-director";
import { isTalkingHeadDirectorNode, talkingHeadDirectorParams } from "@/service/canvas/directors/talking-head-director";
import { readConnectedPromptText, resolveNodeInputs } from "@/service/canvas/core/graph";
import { defaultGroupColor, defaultGroupTitle, readGroupParams } from "@/service/canvas/core/groups";
import { getCanvasModelCatalog } from "@/service/canvas/catalog/model-catalog";
import { type CanvasPlanFrameInputs, canvasPlanFrameInputs } from "@/service/canvas/directors/plan-frame-inputs";
import { buildTalkingHeadExpansion } from "@/service/canvas/scro-groups/talking-head";
import { createCanvasDirectorVideo } from "@/service/canvas/execution/scro-dispatch";
import { buildFramePrompt } from "@/service/higgsfield/frame-prompts";
import { stillBlocker } from "@/service/higgsfield/pipeline";
import { schedulePhaseAWorkerTask } from "@/service/worker/schedule";

type ExpandedPlan = {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  expandedNodeIds: string[];
  summary: string;
  // Frame around the expanded nodes; its id is the node id prefix.
  group: CanvasGroup;
  // Director: the plan to store on the node.
  plan?: ExplainerDirectorPlan;
};

// What a Director is still waiting for while its rows are already on the canvas.
export type DirectorBuildStage = "locks" | "prompts";

export type CanvasExplainerPlanState =
  | { status: "planning" }
  | { status: "failed"; error: string }
  // Phase A is written: a Director can place its rows now; prompts and reference stills follow.
  | (ExpandedPlan & { status: "building"; stage: DirectorBuildStage })
  | (ExpandedPlan & { status: "ready" });

// Plan source for a Director: topic, presenter line, and the old voiceover when the topic is unchanged.
export function explainerPlanSource(node: CanvasNode): string {
  const params = directorParams(node);
  const plan = readDirectorPlan(node);
  const keepNarration =
    plan !== undefined && (plan.plannedWith as ExplainerDirectorParams).topic === params.topic;
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
  const director = isExplainerDirectorNode(loaded.node);
  const planDirector = isPlanDirectorNode(loaded.node);
  const resolved = resolveNodeInputs(
    params.nodeId,
    loaded.canvas.nodes,
    loaded.canvas.edges,
    catalog,
  );
  // Explainer topic is the connected text, even if the card was edited before. Talking Head still lets a typed script win.
  const plannerNode = director
    ? explainerNodeWithWiredTopic(
        loaded.node,
        readConnectedPromptText(params.nodeId, loaded.canvas.nodes, loaded.canvas.edges, catalog),
      )
    : directorNodeWithWiredPrompt(
        loaded.node,
        resolved.promptFromNode ? resolved.inputs.prompt : undefined,
      );
  const isTalking = plannerNode.data.modelId === TALKING_HEAD_PLANNER_MODEL_ID;
  const readyPrompt = director ? (plannerNode.data.prompt ?? "").trim() : (resolved.inputs.prompt ?? "").trim();
  if (!readyPrompt) {
    return { ok: false, error: isTalking ? "請先輸入講稿" : director ? "請先連接解說主題" : "請先輸入或連接解說主題" };
  }
  const inputs = director ? { ...resolved.inputs, prompt: explainerPlanSource(plannerNode) } : resolved.inputs;
  try {
    const videoId = await createCanvasDirectorVideo({
      clerkUserId: params.clerkUserId,
      modelId: isTalking ? "scro:talking-head" : "scro:explainer",
      node: plannerNode,
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
          ...(planDirector
            ? { "nodes.$[n].data.toolParams.planningWith": planDirectorParams(plannerNode) }
            : {}),
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
    if (!video.phaseA || !isPlanDirectorNode(plannerNode)) return { status: "planning" };
    const stage: DirectorBuildStage =
      video.status !== "production" || params.blocker ? "locks" : "prompts";
    return { status: "building", stage, ...expandPlan(params, video.phaseA, true) };
  }
  return { status: "ready", ...expandPlan(params, video.phaseA, false) };
}

// Builds the rows and plan. `partial`: only Phase A is known, so prompts not yet written stay
// empty and Director wires from outputs that do not exist yet are left out.
function expandPlan(
  params: Parameters<typeof planStateFromVideo>[0],
  phaseA: NonNullable<Project["phaseA"]>,
  partial: boolean,
): ExpandedPlan {
  const video = params.video!;
  const { plannerNode } = params;
  const prompts = video.canvasPlan?.prompts ?? [];
  const toolParams = plannerNode.data.toolParams ?? {};
  const language = plannerLanguage(video.language ?? toolParams.language);
  const planningSnapshot = toolParams.planningWith;
  const planningWith =
    planningSnapshot && typeof planningSnapshot === "object"
      ? (planningSnapshot as DirectorPlanParams)
      : undefined;
  const dropdownCharacterId =
    typeof toolParams.characterId === "string" && toolParams.characterId ? toolParams.characterId : undefined;
  // A plan already underway keeps the character it started with, including a wired one.
  const characterId = planningWith ? planningWith.characterId : dropdownCharacterId;
  const promptByClip = new Map(prompts.map((p) => [p.clipNumber, p]));
  const frameByClip = new Map(
    (video.canvasPlan?.framePrompts ?? []).map((f) => [f.clipNumber, f.prompt]),
  );
  // A still prompt the worker has not written yet stays empty until the plan is ready.
  const framePromptFor = (clipNumber: number) =>
    frameByClip.get(clipNumber) || (partial ? "" : params.buildFramePrompt(video, clipNumber));
  const voicePreset = explainerVoicePreset(language, video.voiceGender === "male" ? "male" : "female");
  const summary = [
    phaseA.localizedTitle || phaseA.englishTitle,
    ...phaseA.clips.map((clip) => `${clip.clipNumber}. ${clip.englishVo}`),
  ]
    .filter(Boolean)
    .join("\n");

  if (plannerNode.data.modelId === TALKING_HEAD_PLANNER_MODEL_ID) {
    // A Talking Head Director keeps its card; its outputs feed the rows on its right.
    const directorId = isTalkingHeadDirectorNode(plannerNode) ? plannerNode.id : undefined;
    const framePrompt = framePromptFor(1);
    const thClips = phaseA.clips.map((clip) => ({
      clipNumber: clip.clipNumber,
      spokenLine: clip.englishVo ?? "",
      heygenPrompt: promptByClip.get(clip.clipNumber)?.prompt ?? "",
      durationSeconds: promptByClip.get(clip.clipNumber)?.durationSeconds ?? clip.durationSeconds,
    }));
    const expansion = buildTalkingHeadExpansion({
      idPrefix: params.idPrefix,
      origin: directorId
        ? { x: plannerNode.position.x + DIRECTOR_ROW_OFFSET_X, y: plannerNode.position.y }
        : plannerNode.position,
      aspectRatio: plannerNode.data.aspectRatio ?? "9:16",
      frameResolution: params.frameInputs?.resolution,
      language,
      characterId,
      voicePreset,
      framing: video.talkingHeadPoseId ?? "collarbone-close",
      framePrompt,
      frameRefUrls: params.frameInputs?.refsByClip.get(1),
      clips: thClips,
      ...(directorId ? { directorId } : {}),
      clipJoin: readClipJoin(plannerNode.data.toolParams),
    });
    const group = planGroup({
      id: params.idPrefix,
      kind: "talking-head",
      title: phaseA.localizedTitle || phaseA.englishTitle,
      plannerNode,
      memberIds: [...(directorId ? [directorId] : []), ...expansion.nodes.map((n) => n.id)],
      language,
      framing: video.talkingHeadPoseId ?? "collarbone-close",
    });
    if (!directorId) return { ...expansion, summary, group };
    // Only Clip 1 carries the shared opening still prompt.
    const plan: ExplainerDirectorPlan = {
      plannerVideoId: video._id.toHexString(),
      plannedWith: planningWith ?? talkingHeadDirectorParams(plannerNode),
      clips: thClips.map((clip) => ({
        clipNumber: clip.clipNumber,
        framePrompt: clip.clipNumber === 1 ? framePrompt : "",
        videoPrompt: clip.heygenPrompt,
        spokenLine: clip.spokenLine,
        durationSeconds: clip.durationSeconds ?? 6,
        refUrls: clip.clipNumber === 1 ? (params.frameInputs?.refsByClip.get(1) ?? []) : [],
      })),
    };
    return withLiveDirectorEdges({ ...expansion, summary, group, plan }, directorId, partial);
  }

  // Every Explainer planner is a Director; its outputs feed the rows.
  const directorId = plannerNode.id;
  const clips = phaseA.clips.map((clip) => ({
    clipNumber: clip.clipNumber,
    framePrompt: framePromptFor(clip.clipNumber),
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
    clipJoin: readClipJoin(plannerNode.data.toolParams),
    clips,
  });
  const plannedWith = planningWith ?? directorParams(plannerNode);
  const plan: ExplainerDirectorPlan = { plannerVideoId: video._id.toHexString(), plannedWith, clips };
  const group = planGroup({
    id: params.idPrefix,
    kind: "explainer",
    title: phaseA.localizedTitle || phaseA.englishTitle,
    plannerNode,
    memberIds: [directorId, ...expansion.nodes.map((n) => n.id)],
    language,
  });
  return withLiveDirectorEdges({ ...expansion, summary, group, plan }, directorId, partial);
}

// A partial plan has no still output yet, so its wire waits until the plan is ready.
function withLiveDirectorEdges(expanded: ExpandedPlan, directorId: string, partial: boolean): ExpandedPlan {
  if (!partial || !expanded.plan) return expanded;
  const live = new Set(directorHandles(expanded.plan));
  return {
    ...expanded,
    edges: expanded.edges.filter((e) => e.source !== directorId || !e.sourceHandle || live.has(e.sourceHandle)),
  };
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
