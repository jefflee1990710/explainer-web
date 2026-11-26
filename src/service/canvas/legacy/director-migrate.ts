// Pure: brings canvases saved with settings kinds up to date when they load.
// Swap / Teleport values move onto their wired nodes; an Explainer Settings node becomes an idle Director.

import type { CanvasEdge, CanvasGroup, CanvasNode, CanvasNodeData } from "@/model/canvas";
import { explainerSettingsToolParams, normalizeExplainerSettings } from "@/service/canvas/directors/explainer-settings";
import { withoutModelSettingsEdges } from "@/service/canvas/core/settings/registry";
import { EXPLAINER_PLANNER_MODEL_ID } from "@/service/canvas/directors/explainer-planner";
import { clampSectionLength, trimToolParams } from "@/service/canvas/core/settings/section";

type Graph = { nodes: readonly CanvasNode[]; edges: readonly CanvasEdge[]; groups: readonly CanvasGroup[] };
type Legacy = Record<string, unknown> & {
  kind?: string;
  values?: Record<string, unknown>;
  vars?: Record<string, string>;
};
type Patch = Partial<CanvasNodeData> & { toolParams?: Record<string, unknown> };

const SETTINGS_HANDLE = "settings";
const num = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);

// The same values the Swap / Teleport settings kinds wrote at run time.
function legacyPatch(kind: string, values: Record<string, unknown>, modelId: string | undefined): Patch {
  const start = Math.max(0, num(values.sectionStart, 0));
  const length = clampSectionLength(num(values.sectionLength, 6));
  if (modelId === "ffmpeg:trim-speed") return { presetId: "1.0x", toolParams: trimToolParams(start, length) };
  if (modelId === "ffmpeg:color-grade") {
    const look = typeof values.gradeLook === "string" ? values.gradeLook : "jutsu";
    return { presetId: look, toolParams: { gradeLook: look } };
  }
  const ratio = values.aspectRatio as CanvasNodeData["aspectRatio"];
  const shape = ratio ? { aspectRatio: ratio, presetId: ratio } : {};
  if (kind === "swap" && modelId === "scro:swap-render") {
    return {
      ...shape,
      durationSeconds: length,
      toolParams: {
        ...(values.swapMode ? { swapMode: values.swapMode } : {}),
        ...(values.objectTarget ? { objectTarget: values.objectTarget } : {}),
        ...(values.objectEditMode ? { objectEditMode: values.objectEditMode } : {}),
        ...(values.lightLookId ? { lightLookId: values.lightLookId } : {}),
      },
    };
  }
  if (kind === "teleport" && modelId === "scro:teleport-render") {
    const mood = typeof values.mood === "string" ? values.mood.trim() : "";
    return { ...shape, durationSeconds: length, ...(mood ? { prompt: mood } : {}) };
  }
  return {};
}

function merge(data: CanvasNodeData, patch: Patch): CanvasNodeData {
  const { toolParams, ...rest } = patch;
  return { ...data, ...rest, ...(toolParams ? { toolParams: { ...(data.toolParams ?? {}), ...toolParams } } : {}) };
}

// An idle (unplanned) Director holding an old Explainer's topic and look.
export function explainerDirectorFromSettings(input: {
  groupId: string;
  position: { x: number; y: number };
  settings: Legacy;
  groupParams: Record<string, unknown>;
}): CanvasNode {
  const applied = normalizeExplainerSettings((input.settings.applied ?? {}) as Record<string, unknown>);
  const p = input.groupParams;
  return {
    id: `${input.groupId}-director`,
    type: "model",
    position: input.position,
    data: {
      modelId: EXPLAINER_PLANNER_MODEL_ID,
      prompt: typeof input.settings.topic === "string" ? input.settings.topic : "",
      aspectRatio: (p.aspectRatio as CanvasNodeData["aspectRatio"]) ?? "9:16",
      status: "idle",
      toolParams: {
        plannerMode: true,
        ...(typeof p.characterId === "string" ? { characterId: p.characterId } : {}),
        ...(typeof p.language === "string" ? { language: p.language } : {}),
        ...(typeof p.durationPreset === "string" ? { durationPreset: p.durationPreset } : {}),
        ...explainerSettingsToolParams(applied),
      },
    },
  };
}

// The oldest Explainer Settings nodes kept their data under `explainerSettings`; this moves it
// into `settings` (kind "explainer") so the schema keeps it until the load migration runs.
export function liftLegacyExplainerSettings(nodes: readonly CanvasNode[]): CanvasNode[] {
  return nodes.map((n) => {
    const raw = n.data as Record<string, unknown>;
    const legacy = raw.explainerSettings as Record<string, unknown> | undefined;
    if (!legacy) return n;
    const rest = { ...raw };
    delete rest.explainerSettings;
    return { ...n, data: { ...rest, settings: { kind: "explainer", ...legacy } } as unknown as CanvasNodeData };
  });
}

export function migrateLegacySettings(graph: Graph): {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  groups: CanvasGroup[];
  changed: boolean;
} {
  let nodes = liftLegacyExplainerSettings(graph.nodes);
  let changed = nodes.some((n, i) => n !== graph.nodes[i]);
  let edges = [...graph.edges];
  let groups = [...graph.groups];
  const replaceMember = (oldId: string, newId: string | undefined) => {
    groups = groups.map((g) =>
      g.memberIds.includes(oldId)
        ? {
            ...g,
            memberIds: newId
              ? g.memberIds.map((id) => (id === oldId ? newId : id))
              : g.memberIds.filter((id) => id !== oldId),
          }
        : g,
    );
  };

  for (const node of [...nodes]) {
    if (node.type !== "settings") continue;
    const s = node.data.settings as unknown as Legacy | undefined;
    if (!s || typeof s.kind !== "string") continue;
    changed = true;
    const kind = s.kind;
    const vars = s.vars && Object.keys(s.vars).length > 0 ? s.vars : undefined;

    if (kind === "explainer") {
      const group = groups.find((g) => g.memberIds.includes(node.id));
      const director = explainerDirectorFromSettings({
        groupId: group?.id ?? node.id.replace(/-settings$/, ""),
        position: node.position,
        settings: s,
        groupParams: (group?.params ?? {}) as Record<string, unknown>,
      });
      nodes = nodes.map((n) => (n.id === node.id ? director : n));
      // Frames keep their baked prompts; they get Director wires on the next plan.
      edges = edges.filter((e) => e.source !== node.id && e.target !== node.id);
      replaceMember(node.id, director.id);
      if (vars) {
        const settingId = `${director.id}-setting`;
        nodes.push({
          id: settingId,
          type: "settings",
          position: { x: node.position.x, y: node.position.y - 160 },
          data: { settings: { vars } },
        } as unknown as CanvasNode);
        edges.push({
          id: `${settingId}->${director.id}:${SETTINGS_HANDLE}`,
          source: settingId,
          sourceHandle: "output",
          target: director.id,
          targetHandle: SETTINGS_HANDLE,
        });
      }
      continue;
    }

    if (kind === "swap" || kind === "teleport") {
      const targets = new Set(
        edges.filter((e) => e.source === node.id && e.targetHandle === SETTINGS_HANDLE).map((e) => e.target),
      );
      nodes = nodes.map((t) =>
        targets.has(t.id) ? { ...t, data: merge(t.data, legacyPatch(kind, s.values ?? {}, t.data.modelId)) } : t,
      );
    }

    if (vars) {
      // A Setting with vars stays (and keeps its wires) as a plain key-value map.
      nodes = nodes.map((n) =>
        n.id === node.id ? ({ ...n, data: { ...n.data, settings: { vars } } } as unknown as CanvasNode) : n,
      );
    } else {
      nodes = nodes.filter((n) => n.id !== node.id);
      edges = edges.filter((e) => e.source !== node.id && e.target !== node.id);
      replaceMember(node.id, undefined);
    }
  }
  const stripped = withoutModelSettingsEdges(nodes, edges);
  if (stripped.dropped) {
    edges = stripped.edges;
    changed = true;
  }
  return { nodes, edges, groups, changed };
}
