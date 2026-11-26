// Pure: lays out an expanded Explainer group so cards and wires never overlap.
//
// Per clip row:   [ref] ──▶ [frame] ──▶ [video] ──┐
//                           [voice] ───────────────┴▶ [mux] ──▶ [concat]
// Reference images sit in their own left column beside the first row they feed.
// The voice card sits below the taller of frame/video, so its wire to the mux runs
// under the video card instead of through it. Chained concats step right per batch.

export type LayoutSize = { width: number; height: number };
export type LayoutBox = { x: number; y: number; width: number; height: number };
export type LayoutPoint = { x: number; y: number };

type Role = "settings" | "ref" | "frame" | "video" | "voice" | "mux" | "concat";

// Used before React Flow has measured the cards (server-side and first paint).
export const EXPLAINER_ESTIMATED_SIZE: Record<Role, LayoutSize> = {
  settings: { width: 300, height: 460 },
  ref: { width: 260, height: 280 },
  frame: { width: 312, height: 440 },
  video: { width: 312, height: 560 },
  voice: { width: 312, height: 500 },
  mux: { width: 312, height: 380 },
  concat: { width: 312, height: 340 },
};

const GAP_X = 90;
const GAP_Y = 48;
const ROW_GAP = 110;
// Rough distance from a card's top to its second input handle (mux "refAudio").
const MUX_AUDIO_HANDLE_OFFSET = 112;
const CLEARANCE = 80;

export function explainerNodeRole(id: string): { role: Role; index: number } | null {
  if (id.endsWith("-settings")) return { role: "settings", index: 0 };
  const match = /-(ref|frame|video|voice|mux|concat)-(\d+)$/.exec(id);
  return match ? { role: match[1] as Role, index: Number(match[2]) } : null;
}

export function layoutExplainerGroup(params: {
  nodeIds: readonly string[];
  edges: readonly { source: string; target: string }[];
  origin: LayoutPoint;
  sizeOf?: (id: string) => LayoutSize | undefined;
}): Map<string, LayoutPoint> {
  const size = (id: string, role: Role) => params.sizeOf?.(id) ?? EXPLAINER_ESTIMATED_SIZE[role];
  const byRole = new Map<Role, Map<number, string>>();
  for (const id of params.nodeIds) {
    const parsed = explainerNodeRole(id);
    if (!parsed) continue;
    if (!byRole.has(parsed.role)) byRole.set(parsed.role, new Map());
    byRole.get(parsed.role)!.set(parsed.index, id);
  }
  const ids = (role: Role) => byRole.get(role) ?? new Map<number, string>();
  const colWidth = (...roles: Role[]) =>
    Math.max(0, ...roles.flatMap((r) => [...ids(r).values()].map((id) => size(id, r).width)));

  // Column x positions sized to the widest card in each column.
  const xSettings = params.origin.x;
  const xRef = xSettings + (ids("settings").size ? colWidth("settings") + GAP_X : 0);
  const xFrame = xRef + (ids("ref").size ? colWidth("ref") + GAP_X : 0);
  const xVideo = xFrame + Math.max(colWidth("frame", "voice"), 1) + GAP_X;
  const xMux = xVideo + Math.max(colWidth("video"), 1) + GAP_X;
  const xConcat = xMux + (ids("mux").size ? colWidth("mux") + GAP_X : 0);
  const concatStep = Math.max(colWidth("concat"), 1) + GAP_X;

  const out = new Map<string, LayoutPoint>();
  const settingsId = ids("settings").get(0);
  if (settingsId) out.set(settingsId, { x: xSettings, y: params.origin.y });
  const clipNumbers = [...new Set([...ids("frame").keys(), ...ids("video").keys()])].sort(
    (a, b) => a - b,
  );
  let rowTop = params.origin.y;
  for (const n of clipNumbers) {
    const frameId = ids("frame").get(n);
    const videoId = ids("video").get(n);
    const voiceId = ids("voice").get(n);
    const muxId = ids("mux").get(n);
    const topH = Math.max(
      frameId ? size(frameId, "frame").height : 0,
      videoId ? size(videoId, "video").height : 0,
    );
    if (frameId) out.set(frameId, { x: xFrame, y: rowTop });
    if (videoId) out.set(videoId, { x: xVideo, y: rowTop });
    let rowBottom = rowTop + topH;
    if (voiceId) {
      const voiceTop = rowTop + topH + GAP_Y;
      const voiceH = size(voiceId, "voice").height;
      out.set(voiceId, { x: xFrame, y: voiceTop });
      rowBottom = voiceTop + voiceH;
      if (muxId) {
        // Line the mux audio handle up with the voice output so that wire stays level.
        const muxTop = Math.max(rowTop, voiceTop + voiceH / 2 - MUX_AUDIO_HANDLE_OFFSET);
        out.set(muxId, { x: xMux, y: muxTop });
        rowBottom = Math.max(rowBottom, muxTop + size(muxId, "mux").height);
      }
    } else if (muxId) {
      out.set(muxId, { x: xMux, y: rowTop });
      rowBottom = Math.max(rowBottom, rowTop + size(muxId, "mux").height);
    }
    rowTop = rowBottom + ROW_GAP;
  }

  // Each reference image lines up with the first frame it feeds, stacked so none overlap.
  let refCursor = params.origin.y;
  for (const [, refId] of [...ids("ref").entries()].sort((a, b) => a[0] - b[0])) {
    const targetTops = params.edges
      .filter((e) => e.source === refId)
      .map((e) => out.get(e.target)?.y)
      .filter((y): y is number => typeof y === "number");
    const y = Math.max(refCursor, targetTops.length ? Math.min(...targetTops) : refCursor);
    out.set(refId, { x: xRef, y });
    refCursor = y + size(refId, "ref").height + GAP_Y;
  }

  // Each concat sits centred on the cards wired into it, one column further right per step.
  const concats = [...ids("concat").entries()].sort((a, b) => a[0] - b[0]);
  concats.forEach(([, concatId], step) => {
    const centers = params.edges
      .filter((e) => e.target === concatId)
      .map((e) => {
        const at = out.get(e.source);
        const role = explainerNodeRole(e.source)?.role;
        return at && role ? at.y + size(e.source, role).height / 2 : undefined;
      })
      .filter((y): y is number => typeof y === "number");
    const h = size(concatId, "concat").height;
    const centerY = centers.length
      ? (Math.min(...centers) + Math.max(...centers)) / 2
      : params.origin.y + h / 2;
    const at = { x: xConcat + step * concatStep, y: centerY - h / 2 };
    out.set(concatId, at);
  });

  return out;
}

function boundsOf(
  positions: Map<string, LayoutPoint>,
  sizeOf: (id: string) => LayoutSize,
): LayoutBox | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [id, p] of positions) {
    const s = sizeOf(id);
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x + s.width);
    maxY = Math.max(maxY, p.y + s.height);
  }
  return Number.isFinite(minX) ? { x: minX, y: minY, width: maxX - minX, height: maxY - minY } : null;
}

const overlaps = (a: LayoutBox, b: LayoutBox) =>
  a.x < b.x + b.width + CLEARANCE &&
  b.x < a.x + a.width + CLEARANCE &&
  a.y < b.y + b.height + CLEARANCE &&
  b.y < a.y + a.height + CLEARANCE;

// Moves the whole group down until it clears every other card on the canvas.
export function shiftGroupClearOf(
  positions: Map<string, LayoutPoint>,
  sizeOf: (id: string) => LayoutSize,
  obstacles: readonly LayoutBox[],
): Map<string, LayoutPoint> {
  const box = boundsOf(positions, sizeOf);
  if (!box) return positions;
  let dy = 0;
  for (let guard = 0; guard < obstacles.length + 1; guard += 1) {
    const moved = { ...box, y: box.y + dy };
    const hits = obstacles.filter((o) => overlaps(moved, o));
    if (hits.length === 0) break;
    dy = Math.max(...hits.map((o) => o.y + o.height)) + CLEARANCE - box.y;
  }
  if (dy === 0) return positions;
  return new Map([...positions].map(([id, p]) => [id, { x: p.x, y: p.y + dy }]));
}
