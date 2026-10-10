import { EDIT_LIMITS, type BrandAnchor, type BrandLayer } from "@/model/video-edit";

// Pixel placement of one layer. Height is left to CSS / ffmpeg so the
// image's own aspect ratio never has to be known here.
export type LayerPlacement = { anchor: BrandAnchor; w: number; margin: number };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

// libx264 needs even dimensions.
function even(value: number) {
  return Math.max(2, value - (value % 2));
}

export function layerPlacement(
  layer: Pick<BrandLayer, "anchor" | "marginPct" | "widthPct">,
  frameW: number,
  frameH: number,
): LayerPlacement {
  const { widthPct, marginPct } = EDIT_LIMITS;
  const w = even(Math.round((frameW * clamp(layer.widthPct, widthPct.min, widthPct.max)) / 100));
  const margin = Math.round(
    (Math.min(frameW, frameH) * clamp(layer.marginPct, marginPct.min, marginPct.max)) / 100,
  );
  return { anchor: layer.anchor, w, margin };
}

// ffmpeg overlay x/y expressions for the same placement.
export function overlayPosition(p: LayerPlacement): { x: string; y: string } {
  if (p.anchor === "center") return { x: "(main_w-overlay_w)/2", y: "(main_h-overlay_h)/2" };
  const m = String(p.margin);
  return {
    x: p.anchor.endsWith("left") ? m : `main_w-overlay_w-${m}`,
    y: p.anchor.startsWith("top") ? m : `main_h-overlay_h-${m}`,
  };
}

// Inline style for the preview overlay, in the preview's own pixels.
export function placementStyle(p: LayerPlacement): Record<string, string | number> {
  if (p.anchor === "center") {
    return { width: p.w, left: "50%", top: "50%", transform: "translate(-50%, -50%)" };
  }
  return {
    width: p.w,
    [p.anchor.startsWith("top") ? "top" : "bottom"]: p.margin,
    [p.anchor.endsWith("left") ? "left" : "right"]: p.margin,
  };
}

// After a drag: snap to the corner the box centre is in (or the centre
// zone) and keep the gap to the anchored edges as a % of the short side.
export function placementFromDrag(input: {
  left: number;
  top: number;
  boxW: number;
  boxH: number;
  frameW: number;
  frameH: number;
}): { anchor: BrandAnchor; marginPct: number } {
  const { left, top, boxW, boxH, frameW, frameH } = input;
  const cx = left + boxW / 2;
  const cy = top + boxH / 2;
  if (Math.abs(cx - frameW / 2) < frameW * 0.1 && Math.abs(cy - frameH / 2) < frameH * 0.1) {
    return { anchor: "center", marginPct: 0 };
  }
  const isLeft = cx < frameW / 2;
  const isTop = cy < frameH / 2;
  const dx = isLeft ? left : frameW - left - boxW;
  const dy = isTop ? top : frameH - top - boxH;
  const gap = Math.max(0, Math.min(dx, dy));
  const { min, max } = EDIT_LIMITS.marginPct;
  const marginPct = clamp(round1((gap / Math.min(frameW, frameH)) * 100), min, max);
  return { anchor: `${isTop ? "top" : "bottom"}-${isLeft ? "left" : "right"}`, marginPct };
}

// Pixel box for a logo burned in the browser. Height follows the image aspect, and stays even.
export function layerPixelBox(
  placement: LayerPlacement,
  frameW: number,
  frameH: number,
  imageW: number,
  imageH: number,
) {
  const w = placement.w;
  const h = Math.max(2, Math.round((imageH * w) / Math.max(1, imageW) / 2) * 2);
  if (placement.anchor === "center") {
    return { x: Math.round((frameW - w) / 2), y: Math.round((frameH - h) / 2), w, h };
  }
  const x = placement.anchor.endsWith("left") ? placement.margin : frameW - w - placement.margin;
  const y = placement.anchor.startsWith("top") ? placement.margin : frameH - h - placement.margin;
  return { x, y, w, h };
}

export function widthPctFromBox(boxW: number, frameW: number) {
  const { min, max } = EDIT_LIMITS.widthPct;
  return clamp(round1((boxW / frameW) * 100), min, max);
}
