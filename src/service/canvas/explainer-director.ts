// Pure helpers for the persistent Explainer Director node (scro:explainer in planner mode).

import type { CanvasAspectRatio, CanvasEdge, CanvasNode } from "@/model/canvas";
import { EXPLAINER_PLANNER_MODEL_ID, TALKING_HEAD_PLANNER_MODEL_ID } from "@/service/canvas/explainer-planner";
import { explainerTextStyleLine, TEXT_STYLE_VAR } from "@/service/canvas/settings/explainer-text-style";
import { renderPromptTemplate } from "@/service/canvas/settings/template";

// Older canvases wired a character node here. Both Directors now take the character from the card dropdown.
export const DIRECTOR_CHARACTER_HANDLE = "character";

export type DirectorOutputKind = "frame" | "motion" | "voice";
const OUTPUT_KINDS: readonly DirectorOutputKind[] = ["frame", "motion", "voice"];
const HANDLE = /^clip-(\d+)-(frame|motion|voice)$/;

export type ExplainerDirectorParams = {
  topic: string;
  characterId?: string;
  durationPreset?: string;
  aspectRatio: CanvasAspectRatio;
  skillSlug: string;
  language: string;
  sceneTextLanguage?: string;
  directorBackgroundId?: string;
  presenterPosition: string;
  styleId?: string;
};

// Talking Head Director: every card field that changes the plan.
export type TalkingHeadDirectorParams = {
  script: string;
  characterId?: string;
  language: string;
  framing: string;
  aspectRatio: CanvasAspectRatio;
};

export type DirectorPlanParams = ExplainerDirectorParams | TalkingHeadDirectorParams;

export type ExplainerDirectorClip = {
  clipNumber: number;
  framePrompt: string;
  videoPrompt: string;
  spokenLine: string;
  durationSeconds: number;
  refUrls: string[];
};

export type ExplainerDirectorPlan = {
  plannerVideoId: string;
  plannedWith: DirectorPlanParams;
  clips: ExplainerDirectorClip[];
};

type NodeLike = Pick<CanvasNode, "type" | "data">;

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

type CharacterWireNode = {
  id: string;
  type?: string | null;
  data: { characterId?: string; label?: string; fileName?: string };
};
type CharacterWireEdge = { source: string; target: string; targetHandle?: string | null };

// The character node wired into this Director, if any. Its id wins over the dropdown.
export function wiredDirectorCharacter(
  directorId: string,
  nodes: readonly CharacterWireNode[],
  edges: readonly CharacterWireEdge[],
): { nodeId: string; characterId?: string; label?: string } | undefined {
  const edge = edges.find((e) => e.target === directorId && e.targetHandle === DIRECTOR_CHARACTER_HANDLE);
  if (!edge) return undefined;
  const source = nodes.find((n) => n.id === edge.source);
  if (!source || source.type !== "character") return undefined;
  const characterId = str(source.data.characterId);
  const label = str(source.data.label) ?? str(source.data.fileName);
  return {
    nodeId: source.id,
    ...(characterId ? { characterId } : {}),
    ...(label ? { label } : {}),
  };
}

// Copies the wired character onto the node so planning and the dropdown agree.
export function directorNodeWithWiredCharacter<T extends NodeLike & { id: string }>(
  node: T,
  nodes: readonly CharacterWireNode[],
  edges: readonly CharacterWireEdge[],
): T {
  const wired = wiredDirectorCharacter(node.id, nodes, edges);
  if (!wired) return node;
  return {
    ...node,
    data: {
      ...node.data,
      toolParams: { ...node.data.toolParams, characterId: wired.characterId },
    },
  };
}

export function isExplainerDirectorNode(node: NodeLike): boolean {
  return (
    node.type === "model" &&
    node.data.modelId === EXPLAINER_PLANNER_MODEL_ID &&
    node.data.toolParams?.plannerMode === true
  );
}

// Older canvases wired a character node into a Director. That input is gone on both cards.
export function withoutDirectorCharacterEdges<
  N extends NodeLike & { id: string },
  E extends { target: string; targetHandle?: string | null },
>(nodes: readonly N[], edges: readonly E[]): E[] {
  const directors = new Set(nodes.filter(isPlanDirectorNode).map((n) => n.id));
  if (directors.size === 0) return [...edges];
  return edges.filter((e) => !(directors.has(e.target) && e.targetHandle === DIRECTOR_CHARACTER_HANDLE));
}

export function isTalkingHeadDirectorNode(node: NodeLike): boolean {
  return (
    node.type === "model" &&
    node.data.modelId === TALKING_HEAD_PLANNER_MODEL_ID &&
    node.data.toolParams?.plannerMode === true
  );
}

// Either Director: keeps its card after planning and feeds its rows through text outputs.
export function isPlanDirectorNode(node: NodeLike): boolean {
  return isExplainerDirectorNode(node) || isTalkingHeadDirectorNode(node);
}

export function talkingHeadDirectorParams(node: NodeLike): TalkingHeadDirectorParams {
  const tp = node.data.toolParams ?? {};
  const characterId = str(tp.characterId);
  return {
    script: (node.data.prompt ?? "").trim(),
    ...(characterId ? { characterId } : {}),
    language: str(tp.language) ?? "yue",
    framing: str(tp.framing) ?? "collarbone-close",
    aspectRatio: node.data.aspectRatio ?? "9:16",
  };
}

// The plan-changing parameters of either Director.
export function planDirectorParams(node: NodeLike): DirectorPlanParams {
  return isTalkingHeadDirectorNode(node) ? talkingHeadDirectorParams(node) : directorParams(node);
}

// Every parameter that changes the plan. The text style is not one: it fills {{text_style}}.
export function directorParams(node: NodeLike): ExplainerDirectorParams {
  const tp = node.data.toolParams ?? {};
  const characterId = str(tp.characterId);
  const durationPreset = str(tp.durationPreset);
  const sceneTextLanguage = str(tp.sceneTextLanguage);
  const directorBackgroundId = str(tp.directorBackgroundId);
  const styleId = str(tp.styleId);
  return {
    topic: (node.data.prompt ?? "").trim(),
    ...(characterId ? { characterId } : {}),
    ...(durationPreset ? { durationPreset } : {}),
    aspectRatio: node.data.aspectRatio ?? "9:16",
    skillSlug: str(tp.skillSlug) ?? "cartoon-explainer-video-director",
    language: str(tp.language) ?? "yue",
    ...(sceneTextLanguage ? { sceneTextLanguage } : {}),
    ...(directorBackgroundId ? { directorBackgroundId } : {}),
    presenterPosition: str(tp.presenterPosition) ?? "auto",
    ...(styleId ? { styleId } : {}),
  };
}

export function directorTextStyle(node: NodeLike): string {
  return str(node.data.toolParams?.textStyleId) ?? "handwritten";
}

function readClip(raw: unknown): ExplainerDirectorClip | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const c = raw as Record<string, unknown>;
  if (typeof c.clipNumber !== "number") return undefined;
  if (typeof c.framePrompt !== "string" || typeof c.videoPrompt !== "string" || typeof c.spokenLine !== "string") {
    return undefined;
  }
  return {
    clipNumber: c.clipNumber,
    framePrompt: c.framePrompt,
    videoPrompt: c.videoPrompt,
    spokenLine: c.spokenLine,
    durationSeconds: typeof c.durationSeconds === "number" ? c.durationSeconds : 6,
    refUrls: Array.isArray(c.refUrls) ? c.refUrls.filter((u): u is string => typeof u === "string") : [],
  };
}

export function readDirectorPlan(node: NodeLike): ExplainerDirectorPlan | undefined {
  const raw = node.data.toolParams?.plan;
  if (!raw || typeof raw !== "object") return undefined;
  const p = raw as Record<string, unknown>;
  if (typeof p.plannerVideoId !== "string" || !Array.isArray(p.clips) || !p.plannedWith) return undefined;
  const clips = p.clips.map(readClip);
  if (clips.length === 0 || clips.some((c) => !c)) return undefined;
  return {
    plannerVideoId: p.plannerVideoId,
    plannedWith: p.plannedWith as DirectorPlanParams,
    clips: (clips as ExplainerDirectorClip[]).sort((a, b) => a.clipNumber - b.clipNumber),
  };
}

export function directorHandleId(clipNumber: number, kind: DirectorOutputKind): string {
  return `clip-${clipNumber}-${kind}`;
}

export function parseDirectorHandle(
  handle: string | null | undefined,
): { clipNumber: number; kind: DirectorOutputKind } | undefined {
  const m = handle ? HANDLE.exec(handle) : null;
  return m ? { clipNumber: Number(m[1]), kind: m[2] as DirectorOutputKind } : undefined;
}

// A clip with no still prompt (Talking Head clips after the shared opening still) has no frame output.
export function directorHandles(plan: ExplainerDirectorPlan): string[] {
  return plan.clips.flatMap((c) =>
    OUTPUT_KINDS.filter((k) => k !== "frame" || c.framePrompt.trim()).map((k) => directorHandleId(c.clipNumber, k)),
  );
}

export function directorNeedsReplan(node: NodeLike): boolean {
  const plan = readDirectorPlan(node);
  if (!plan) return false;
  const now = planDirectorParams(node) as Record<string, unknown>;
  const then = plan.plannedWith as Record<string, unknown>;
  const keys = new Set([...Object.keys(now), ...Object.keys(then)]);
  return [...keys].some((key) => (now[key] ?? null) !== (then[key] ?? null));
}

// The Director's own vars: its text style fills {{text_style}}.
export function directorBaseVars(node: NodeLike): Record<string, string> {
  return { [TEXT_STYLE_VAR]: explainerTextStyleLine(directorTextStyle(node)) };
}

export function directorRawOutput(node: NodeLike, handle: string): string | undefined {
  const parsed = parseDirectorHandle(handle);
  const clip = parsed ? readDirectorPlan(node)?.clips.find((c) => c.clipNumber === parsed.clipNumber) : undefined;
  if (!parsed || !clip) return undefined;
  if (parsed.kind === "frame") return clip.framePrompt;
  return parsed.kind === "motion" ? clip.videoPrompt : clip.spokenLine;
}

function renderedOutputs(node: NodeLike): Map<string, string> {
  const plan = readDirectorPlan(node);
  const vars = directorBaseVars(node);
  const out = new Map<string, string>();
  for (const handle of plan ? directorHandles(plan) : []) {
    out.set(handle, renderPromptTemplate(directorRawOutput(node, handle) ?? "", vars).text);
  }
  return out;
}

// Targets wired to an output whose text differs (or disappeared) between two Director states.
export function directorChangedTargets(
  before: NodeLike,
  after: NodeLike & { id: string },
  edges: readonly CanvasEdge[],
): string[] {
  const a = renderedOutputs(before);
  const b = renderedOutputs(after);
  const out: string[] = [];
  for (const e of edges) {
    const handle = e.sourceHandle;
    if (e.source !== after.id || !handle || !parseDirectorHandle(handle)) continue;
    if (a.get(handle) !== b.get(handle) && !out.includes(e.target)) out.push(e.target);
  }
  return out;
}
