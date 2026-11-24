// Pure helpers for the persistent Explainer Director node (scro:explainer in planner mode).

import type { CanvasAspectRatio, CanvasEdge, CanvasNode } from "@/model/canvas";
import { EXPLAINER_PLANNER_MODEL_ID } from "@/service/canvas/explainer-planner";
import { explainerTextStyleLine, TEXT_STYLE_VAR } from "@/service/canvas/settings/explainer-text-style";
import { renderPromptTemplate } from "@/service/canvas/settings/template";

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
  plannedWith: ExplainerDirectorParams;
  clips: ExplainerDirectorClip[];
};

type NodeLike = Pick<CanvasNode, "type" | "data">;

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

export function isExplainerDirectorNode(node: NodeLike): boolean {
  return (
    node.type === "model" &&
    node.data.modelId === EXPLAINER_PLANNER_MODEL_ID &&
    node.data.toolParams?.plannerMode === true
  );
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
    plannedWith: p.plannedWith as ExplainerDirectorParams,
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

export function directorHandles(plan: ExplainerDirectorPlan): string[] {
  return plan.clips.flatMap((c) => OUTPUT_KINDS.map((k) => directorHandleId(c.clipNumber, k)));
}

export function directorNeedsReplan(node: NodeLike): boolean {
  const plan = readDirectorPlan(node);
  if (!plan) return false;
  const now = directorParams(node) as Record<string, unknown>;
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
