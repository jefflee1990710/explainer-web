// Pure helpers for Command (Mac) / Control (Windows) marquee selection and moving that selection.

export type SelectionPlatform = "mac" | "other";

export type SelectionRect = { x: number; y: number; width: number; height: number };

export type SelectableNodeBox = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  hidden?: boolean;
  selectable?: boolean;
};

// A few pixels of movement before a modifier press counts as a drag, so a click still clicks.
export const SELECTION_DRAG_THRESHOLD_PX = 4;

const PANE_BLOCK =
  ".react-flow__node, .react-flow__edge, .react-flow__handle, .react-flow__controls, .react-flow__minimap, .react-flow__panel, .react-flow__nodesselection, .react-flow__attribution, .react-flow__resize-control";

export function selectionPlatformOf(hints: {
  platform?: string;
  userAgent?: string;
}): SelectionPlatform {
  const platform = hints.platform ?? "";
  const userAgent = hints.userAgent ?? "";
  if (/Mac|iPhone|iPad|iPod/i.test(platform) || /Mac OS|iPhone|iPad|iPod|Macintosh/i.test(userAgent)) {
    return "mac";
  }
  return "other";
}

// Mac uses Command. Windows (and other desktops) use Control. Plain left-drag is not a selection.
export function isModifierSelectionGesture(input: {
  platform: SelectionPlatform;
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
}): boolean {
  if (input.button !== 0) return false;
  return input.platform === "mac" ? input.metaKey : input.ctrlKey;
}

// Empty canvas only. Nodes, edges, and the control widgets keep their own pointer behavior.
export function isCanvasPaneTarget(target: Element): boolean {
  if (!target.closest(".react-flow__pane")) return false;
  if (target.closest(PANE_BLOCK)) return false;
  return true;
}

export function selectionRectFromPoints(
  start: { x: number; y: number },
  end: { x: number; y: number },
): SelectionRect {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}

export function selectionPassedThreshold(
  dx: number,
  dy: number,
  threshold = SELECTION_DRAG_THRESHOLD_PX,
): boolean {
  return dx * dx + dy * dy > threshold * threshold;
}

export function nodeFullyInsideRect(
  node: { x: number; y: number; width: number; height: number },
  rect: SelectionRect,
): boolean {
  return (
    node.x >= rect.x &&
    node.y >= rect.y &&
    node.x + node.width <= rect.x + rect.width &&
    node.y + node.height <= rect.y + rect.height
  );
}

// Nodes completely inside the marquee. Partial overlaps stay unselected.
export function nodesInsideSelection(nodes: readonly SelectableNodeBox[], rect: SelectionRect): string[] {
  const ids: string[] = [];
  for (const node of nodes) {
    if (node.hidden || node.selectable === false) continue;
    if (nodeFullyInsideRect(node, rect)) ids.push(node.id);
  }
  return ids;
}

export function nodeSelectionBox(node: {
  id: string;
  position: { x: number; y: number };
  measured?: { width?: number; height?: number };
  width?: number;
  height?: number;
  hidden?: boolean;
  selectable?: boolean;
}): SelectableNodeBox {
  return {
    id: node.id,
    x: node.position.x,
    y: node.position.y,
    width: node.measured?.width ?? node.width ?? 0,
    height: node.measured?.height ?? node.height ?? 0,
    hidden: node.hidden,
    selectable: node.selectable,
  };
}

export function flowDeltaFromScreen(dx: number, dy: number, zoom: number): { dx: number; dy: number } {
  const scale = zoom > 0 && Number.isFinite(zoom) ? zoom : 1;
  return { dx: dx / scale, dy: dy / scale };
}

export function selectedMoveOrigins<T extends { id: string; position: { x: number; y: number }; selected?: boolean; draggable?: boolean }>(
  nodes: readonly T[],
  lockedIds: ReadonlySet<string>,
): Map<string, { x: number; y: number }> {
  const origins = new Map<string, { x: number; y: number }>();
  for (const node of nodes) {
    if (!node.selected || node.draggable === false || lockedIds.has(node.id)) continue;
    origins.set(node.id, { x: node.position.x, y: node.position.y });
  }
  return origins;
}

export function translatePositions<T extends { id: string; position: { x: number; y: number } }>(
  nodes: readonly T[],
  origins: ReadonlyMap<string, { x: number; y: number }>,
  delta: { dx: number; dy: number },
): T[] {
  return nodes.map((node) => {
    const origin = origins.get(node.id);
    if (!origin) return node;
    const x = origin.x + delta.dx;
    const y = origin.y + delta.dy;
    if (node.position.x === x && node.position.y === y) return node;
    return { ...node, position: { x, y } };
  });
}

export function withSelectedIds<T extends { id: string; selected?: boolean }>(
  nodes: readonly T[],
  selected: ReadonlySet<string>,
): T[] {
  let changed = false;
  const next = nodes.map((node) => {
    const on = selected.has(node.id);
    if (Boolean(node.selected) === on) return node;
    changed = true;
    return { ...node, selected: on };
  });
  return changed ? next : (nodes as T[]);
}
