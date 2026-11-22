// Pure helpers for canvas groups: keep membership valid, infer groups on older canvases,
// and read a director group's settings from its nodes.

import type {
  CanvasAspectRatio,
  CanvasGroup,
  CanvasGroupColor,
  CanvasGroupKind,
  CanvasGroupParams,
  CanvasNode,
} from "@/model/canvas";

export const CANVAS_GROUP_COLORS: readonly CanvasGroupColor[] = [
  "lime",
  "sky",
  "violet",
  "amber",
  "rose",
  "slate",
];

const KIND_COLOR: Record<CanvasGroupKind, CanvasGroupColor> = {
  explainer: "lime",
  "talking-head": "sky",
  life: "amber",
  poster: "rose",
  swap: "violet",
  teleport: "violet",
  custom: "slate",
};

const KIND_TITLE: Record<CanvasGroupKind, string> = {
  explainer: "Explainer",
  "talking-head": "Talking Head",
  life: "Life Photo",
  poster: "Poster",
  swap: "Scro Swap",
  teleport: "Teleport",
  custom: "Group",
};

export function defaultGroupColor(kind: CanvasGroupKind): CanvasGroupColor {
  return KIND_COLOR[kind];
}

export function defaultGroupTitle(kind: CanvasGroupKind, subtitle?: string): string {
  const base = KIND_TITLE[kind];
  const extra = subtitle?.trim();
  return (extra ? `${base} · ${extra}` : base).slice(0, 120);
}

// Director groups that can be re-planned with a new script in one step.
export function isDirectorGroupKind(kind: CanvasGroupKind): kind is "explainer" | "talking-head" {
  return kind === "explainer" || kind === "talking-head";
}

// Drops missing members, keeps each node in its first group only, and drops empty or duplicate groups.
export function normalizeCanvasGroups(
  groups: readonly CanvasGroup[] | undefined,
  nodes: readonly Pick<CanvasNode, "id">[],
): CanvasGroup[] {
  if (!groups?.length) return [];
  const live = new Set(nodes.map((n) => n.id));
  const taken = new Set<string>();
  const seenGroups = new Set<string>();
  const out: CanvasGroup[] = [];
  for (const group of groups) {
    if (seenGroups.has(group.id)) continue;
    const memberIds = group.memberIds.filter((id) => {
      if (!live.has(id) || taken.has(id)) return false;
      taken.add(id);
      return true;
    });
    if (memberIds.length === 0) continue;
    seenGroups.add(group.id);
    const same =
      memberIds.length === group.memberIds.length &&
      memberIds.every((id, i) => id === group.memberIds[i]);
    out.push(same ? group : { ...group, memberIds });
  }
  return out;
}

export function groupOfNode(
  groups: readonly CanvasGroup[],
  nodeId: string,
): CanvasGroup | undefined {
  return groups.find((g) => g.memberIds.includes(nodeId));
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

// First non-empty setting found across a group's nodes (planner card, voice, or frame nodes).
export function readGroupParams(nodes: readonly CanvasNode[]): CanvasGroupParams {
  const params = nodes.map((n) => n.data.toolParams ?? {});
  const pick = (key: string) => params.map((p) => str(p[key])).find(Boolean);
  const aspectRatio = nodes
    .map((n) => n.data.aspectRatio)
    .find((r): r is CanvasAspectRatio => Boolean(r));
  const out: CanvasGroupParams = {
    characterId: pick("characterId"),
    language: pick("language"),
    skillSlug: pick("skillSlug"),
    durationPreset: pick("durationPreset"),
    aspectRatio,
    framing: pick("framing"),
  };
  return Object.fromEntries(
    Object.entries(out).filter(([, v]) => v !== undefined),
  ) as CanvasGroupParams;
}

const LEGACY_PREFIX = /^((exp|th|life|poster|swap|teleport)-[A-Za-z0-9]{6}|grp-[A-Za-z0-9]+)-/;

const PREFIX_KIND: Record<string, CanvasGroupKind> = {
  exp: "explainer",
  th: "talking-head",
  life: "life",
  poster: "poster",
  swap: "swap",
  teleport: "teleport",
};

// Agent groups use "grp-"; their kind comes from the render node they contain.
function agentGroupKind(nodes: readonly CanvasNode[]): CanvasGroupKind {
  const models = new Set(nodes.map((n) => n.data.modelId));
  if (models.has("scro:swap-render")) return "swap";
  if (models.has("scro:teleport-render")) return "teleport";
  return "custom";
}

// Builds groups from id prefixes for nodes that are not grouped yet (canvases saved before groups).
export function inferLegacyGroups(
  nodes: readonly CanvasNode[],
  existing: readonly CanvasGroup[] = [],
): CanvasGroup[] {
  const grouped = new Set(existing.flatMap((g) => g.memberIds));
  const byPrefix = new Map<string, CanvasNode[]>();
  for (const node of nodes) {
    if (grouped.has(node.id)) continue;
    const prefix = LEGACY_PREFIX.exec(node.id)?.[1];
    if (!prefix) continue;
    byPrefix.set(prefix, [...(byPrefix.get(prefix) ?? []), node]);
  }
  const inferred: CanvasGroup[] = [];
  for (const [prefix, members] of byPrefix) {
    if (members.length < 2) continue;
    const head = prefix.split("-")[0]!;
    const kind = PREFIX_KIND[head] ?? agentGroupKind(members);
    const params = readGroupParams(members);
    inferred.push({
      id: prefix,
      title: defaultGroupTitle(kind),
      color: defaultGroupColor(kind),
      kind,
      memberIds: members.map((n) => n.id),
      ...(Object.keys(params).length > 0 ? { params } : {}),
    });
  }
  return [...existing, ...inferred];
}

// Groups to show for a stored canvas: inferred once when the field is missing, then kept valid.
export function canvasGroupsForProject(
  nodes: readonly CanvasNode[],
  groups: readonly CanvasGroup[] | undefined,
): CanvasGroup[] {
  const base = groups === undefined ? inferLegacyGroups(nodes) : groups;
  return normalizeCanvasGroups(base, nodes);
}

// Adds a group, taking its members out of any other group first.
export function withGroup(groups: readonly CanvasGroup[], group: CanvasGroup): CanvasGroup[] {
  const members = new Set(group.memberIds);
  const rest = groups
    .filter((g) => g.id !== group.id)
    .map((g) =>
      g.memberIds.some((id) => members.has(id))
        ? { ...g, memberIds: g.memberIds.filter((id) => !members.has(id)) }
        : g,
    )
    .filter((g) => g.memberIds.length > 0);
  return [...rest, group];
}

export type GroupRect = { x: number; y: number; width: number; height: number };

export const GROUP_FRAME_PADDING = 28;
export const GROUP_FRAME_HEADER = 44;

// Frame rectangle around member rectangles: padding on every side plus room for the title bar.
export function groupFrameBounds(rects: readonly GroupRect[]): GroupRect | null {
  if (rects.length === 0) return null;
  const minX = Math.min(...rects.map((r) => r.x));
  const minY = Math.min(...rects.map((r) => r.y));
  const maxX = Math.max(...rects.map((r) => r.x + r.width));
  const maxY = Math.max(...rects.map((r) => r.y + r.height));
  return {
    x: minX - GROUP_FRAME_PADDING,
    y: minY - GROUP_FRAME_PADDING - GROUP_FRAME_HEADER,
    width: maxX - minX + GROUP_FRAME_PADDING * 2,
    height: maxY - minY + GROUP_FRAME_PADDING * 2 + GROUP_FRAME_HEADER,
  };
}
