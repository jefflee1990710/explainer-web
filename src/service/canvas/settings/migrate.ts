// Brings canvases saved before settings kinds up to date when they load.

import type { CanvasAspectRatio, CanvasEdge, CanvasGroup, CanvasNode } from "@/model/canvas";
import {
  CANVAS_GRADE_LOOKS,
  SWAP_OBJECT_EDIT_MODES,
  SWAP_SETTINGS_MODES,
  type CanvasGradeLook,
  type CanvasSettingsData,
} from "@/model/canvas-settings";
import type { ExplainerSettingsNodeData } from "@/model/explainer-settings";
import { settingsKindDef } from "@/service/canvas/settings/registry";
import { clampSectionLength } from "@/service/canvas/settings/section";
import { SETTINGS_HANDLE } from "@/service/canvas/settings/types";

type LegacyData = CanvasNode["data"] & { explainerSettings?: ExplainerSettingsNodeData };

// Older Explainer Settings nodes stored their data under `explainerSettings`.
export function upgradeLegacySettingsNodes(nodes: readonly CanvasNode[]): { nodes: CanvasNode[]; changed: boolean } {
  let changed = false;
  const next = nodes.map((node) => {
    const data = node.data as LegacyData;
    if (!data.explainerSettings) return node;
    changed = true;
    const { explainerSettings, ...rest } = data;
    return { ...node, data: { ...rest, settings: { kind: "explainer" as const, ...explainerSettings } } };
  });
  return { nodes: next, changed };
}

type Graph = { nodes: readonly CanvasNode[]; edges: readonly CanvasEdge[]; groups: readonly CanvasGroup[] };
const SETTINGS_GAP = 90;
const SETTINGS_WIDTH = 280;

const num = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
const pick = <T extends string>(allowed: readonly T[], v: unknown, fallback: T): T =>
  allowed.includes(v as T) ? (v as T) : fallback;
const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

function valuesFromMembers(
  kind: "swap" | "teleport",
  members: readonly CanvasNode[],
  mood: string | undefined,
): CanvasSettingsData {
  const byModel = (id: string) => members.find((n) => n.data.modelId === id);
  const trim = byModel("ffmpeg:trim-speed");
  const render = byModel(kind === "swap" ? "scro:swap-render" : "scro:teleport-render");
  const grade = byModel("ffmpeg:color-grade");
  const start = Math.max(0, num(trim?.data.toolParams?.ffmpegStartSec, 0));
  const end = num(trim?.data.toolParams?.ffmpegEndSec, Number.NaN);
  const length = clampSectionLength(Number.isFinite(end) ? end - start : num(render?.data.durationSeconds, 6));
  const aspectRatio: CanvasAspectRatio = render?.data.aspectRatio ?? "9:16";
  const gradeLook: CanvasGradeLook = pick(CANVAS_GRADE_LOOKS, grade?.data.toolParams?.gradeLook, "jutsu");
  if (kind === "teleport") {
    return { kind, values: { sectionStart: start, sectionLength: length, aspectRatio, ...(mood ? { mood } : {}), gradeLook } };
  }
  const tp = render?.data.toolParams ?? {};
  const objectTarget = text(tp.objectTarget);
  const lightLookId = text(tp.lightLookId);
  return {
    kind,
    values: {
      // A Swap group without a render step is a color fix on the whole video.
      swapMode: render ? pick(SWAP_SETTINGS_MODES, tp.swapMode, "character") : "colorfix",
      ...(objectTarget ? { objectTarget } : {}),
      ...(tp.objectEditMode ? { objectEditMode: pick(SWAP_OBJECT_EDIT_MODES, tp.objectEditMode, "change") } : {}),
      ...(lightLookId ? { lightLookId } : {}),
      sectionStart: start,
      sectionLength: length,
      aspectRatio,
      gradeLook,
    },
  };
}

// Swap / Teleport groups made before settings nodes get one, read from their current nodes.
export function withToolSettingsNodes(graph: Graph): {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  groups: CanvasGroup[];
  changed: boolean;
} {
  let nodes = [...graph.nodes];
  let edges = [...graph.edges];
  let changed = false;
  const groups = graph.groups.map((group) => {
    if (group.kind !== "swap" && group.kind !== "teleport") return group;
    const kind = group.kind;
    const members = nodes.filter((n) => group.memberIds.includes(n.id));
    if (members.length === 0 || members.some((n) => n.type === "settings")) return group;
    const targets = members.filter((n) => settingsKindDef(kind).accepts(n));
    if (targets.length === 0) return group;

    // A Teleport Mood prompt wired into the render moves into the settings.
    const render = targets.find((n) => n.data.modelId === "scro:teleport-render");
    const moodEdge = render
      ? edges.find((e) => e.target === render.id && e.targetHandle === "prompt" && e.source === `${group.id}-mood`)
      : undefined;
    const moodNode = moodEdge ? nodes.find((n) => n.id === moodEdge.source && n.type === "prompt") : undefined;
    const mood = text(moodNode?.data.text);

    const settingsId = `${group.id}-settings`;
    const settings: CanvasNode = {
      id: settingsId,
      type: "settings",
      position: {
        x: Math.min(...members.map((n) => n.position.x)) - SETTINGS_WIDTH - SETTINGS_GAP,
        y: Math.min(...members.map((n) => n.position.y)),
      },
      data: { label: settingsKindDef(kind).label.zh, settings: valuesFromMembers(kind, members, mood) },
    };
    if (moodNode) {
      nodes = nodes.filter((n) => n.id !== moodNode.id);
      edges = edges.filter((e) => e.source !== moodNode.id && e.target !== moodNode.id);
    }
    nodes.push(settings);
    edges.push(
      ...targets.map((t) => ({
        id: `${settingsId}->${t.id}:${SETTINGS_HANDLE}`,
        source: settingsId,
        sourceHandle: "output",
        target: t.id,
        targetHandle: SETTINGS_HANDLE,
      })),
    );
    changed = true;
    return { ...group, memberIds: [settingsId, ...group.memberIds.filter((id) => id !== moodNode?.id)] };
  });
  return { nodes, edges, groups, changed };
}
