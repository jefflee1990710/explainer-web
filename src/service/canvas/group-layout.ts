// Pure: column layout for a group of new canvas nodes, ordered by wiring depth.

export type LayoutSize = { width: number; height: number };

// Used before React Flow has measured the cards.
export const GROUP_ESTIMATED_SIZE: Record<"prompt" | "media" | "model", LayoutSize> = {
  prompt: { width: 280, height: 220 },
  media: { width: 260, height: 280 },
  model: { width: 312, height: 480 },
};

const GAP_X = 90;
const GAP_Y = 60;

export function layoutGroupByDepth(input: {
  nodeIds: readonly string[];
  edges: readonly { source: string; target: string }[];
  origin: { x: number; y: number };
  sizeOf: (id: string) => LayoutSize;
}): Map<string, { x: number; y: number }> {
  const ids = new Set(input.nodeIds);
  const inner = input.edges.filter((e) => ids.has(e.source) && ids.has(e.target));

  // Longest-path depth; groups are small DAGs, so repeated relaxation is enough.
  const depth = new Map<string, number>(input.nodeIds.map((id) => [id, 0]));
  for (let pass = 0; pass < input.nodeIds.length; pass += 1) {
    let changed = false;
    for (const e of inner) {
      const next = (depth.get(e.source) ?? 0) + 1;
      if (next > (depth.get(e.target) ?? 0)) {
        depth.set(e.target, next);
        changed = true;
      }
    }
    if (!changed) break;
  }

  const columns: string[][] = [];
  for (const id of input.nodeIds) (columns[depth.get(id) ?? 0] ??= []).push(id);

  const row = new Map<string, number>();
  const positions = new Map<string, { x: number; y: number }>();
  const parentRow = (id: string) => {
    const rows = inner.filter((e) => e.target === id).map((e) => row.get(e.source) ?? 0);
    return rows.length > 0 ? rows.reduce((a, b) => a + b, 0) / rows.length : 0;
  };

  let x = input.origin.x;
  for (const column of columns.filter(Boolean)) {
    // Later columns follow their parents' order so wires stay short.
    const ordered =
      positions.size === 0 ? column : [...column].sort((a, b) => parentRow(a) - parentRow(b));
    let y = input.origin.y;
    ordered.forEach((id, index) => {
      row.set(id, index);
      positions.set(id, { x, y });
      y += input.sizeOf(id).height + GAP_Y;
    });
    x += Math.max(...column.map((id) => input.sizeOf(id).width)) + GAP_X;
  }
  return positions;
}
