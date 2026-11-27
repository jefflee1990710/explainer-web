// Block boxes for the hero canvas illustration, in design units.
// `d` is the wide layout (1000 × 640) and `m` is the phone layout (400 × 604).
export type HeroBox = { x: number; y: number; w: number; h: number };

export type HeroBlockId = "prompt" | "character" | "voice" | "video" | "mix" | "reel";

export const HERO_STAGE = {
  d: { w: 1000, h: 640 },
  m: { w: 400, h: 604 },
} as const;

export const HERO_BLOCKS: Record<HeroBlockId, { d: HeroBox; m: HeroBox }> = {
  prompt: { d: { x: 24, y: 24, w: 250, h: 128 }, m: { x: 12, y: 12, w: 180, h: 112 } },
  character: { d: { x: 24, y: 178, w: 250, h: 196 }, m: { x: 12, y: 140, w: 180, h: 160 } },
  voice: { d: { x: 24, y: 400, w: 250, h: 104 }, m: { x: 12, y: 316, w: 180, h: 92 } },
  video: { d: { x: 336, y: 88, w: 280, h: 250 }, m: { x: 208, y: 12, w: 180, h: 158 } },
  mix: { d: { x: 336, y: 372, w: 280, h: 132 }, m: { x: 208, y: 184, w: 180, h: 106 } },
  reel: { d: { x: 676, y: 24, w: 300, h: 560 }, m: { x: 208, y: 306, w: 180, h: 286 } },
};

// Wires as [from, to]; drawn from the right edge of `from` to the left edge of `to`
// (on phones a wire may run top → bottom when the blocks are stacked).
export const HERO_WIRES: readonly [HeroBlockId, HeroBlockId][] = [
  ["prompt", "video"],
  ["character", "video"],
  ["voice", "mix"],
  ["video", "mix"],
  ["mix", "reel"],
];

export const HERO_ASSISTANT = {
  d: { x: 24, y: 528, w: 620, h: 88 },
  m: { x: 12, y: 424, w: 180, h: 168 },
} as const;

// One cubic path between two boxes, picking edge anchors that suit their relative position.
export function heroWirePath(from: HeroBox, to: HeroBox): string {
  const fromRight = from.x + from.w;
  if (to.x >= fromRight - 4) {
    const x1 = fromRight;
    const y1 = from.y + from.h / 2;
    const x2 = to.x;
    const y2 = to.y + to.h / 2;
    const dx = Math.max(40, (x2 - x1) / 2);
    return `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
  }
  if (to.x + to.w <= from.x + 4) {
    // Target sits to the left: leave from the left edge.
    const x1 = from.x;
    const y1 = from.y + from.h / 2;
    const x2 = to.x + to.w;
    const y2 = to.y + to.h / 2;
    const dx = Math.max(40, (x1 - x2) / 2);
    return `M${x1},${y1} C${x1 - dx},${y1} ${x2 + dx},${y2} ${x2},${y2}`;
  }
  // Stacked vertically: bottom edge → top edge.
  const x1 = from.x + from.w / 2;
  const y1 = from.y + from.h;
  const x2 = to.x + to.w / 2;
  const y2 = to.y;
  const dy = Math.max(24, (y2 - y1) / 2);
  return `M${x1},${y1} C${x1},${y1 + dy} ${x2},${y2 - dy} ${x2},${y2}`;
}
