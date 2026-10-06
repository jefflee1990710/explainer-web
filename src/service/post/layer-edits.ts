import { POSTER_CANVAS, type PosterLayer, type PosterTextLayer } from "@/model/post";
import { truncateSlot } from "@/service/post/copy";

const MIN_SIZE = 48;

export type LayerEdit = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  text?: string;
  fontSize?: number;
};

// Keep a moved box from leaving the frame with nothing to grab.
function clampAxis(value: number, size: number, limit: number) {
  const next = Number.isFinite(value) ? Math.round(value) : 0;
  const min = -size + MIN_SIZE;
  const max = limit - MIN_SIZE;
  return Math.min(max, Math.max(min, next));
}

function clampSize(value: number) {
  if (!Number.isFinite(value)) return MIN_SIZE;
  return Math.min(1400, Math.max(MIN_SIZE, Math.round(value)));
}

function clampFont(value: number) {
  if (!Number.isFinite(value)) return 32;
  return Math.min(400, Math.max(12, Math.round(value)));
}

// Apply move, scale, and text. Shape kind, fill, and role stay as stored.
export function mergeLayerEdits(
  existing: PosterLayer[],
  submitted: LayerEdit[],
): { ok: true; layers: PosterLayer[] } | { ok: false; error: "unknown_layer" } {
  const byId = new Map(submitted.map((layer) => [layer.id, layer]));
  if (byId.size !== existing.length || existing.some((layer) => !byId.has(layer.id))) {
    return { ok: false, error: "unknown_layer" };
  }

  const layers = existing.map((layer) => {
    const edit = byId.get(layer.id)!;
    const w = clampSize(edit.w);
    const h = clampSize(edit.h);
    const x = clampAxis(edit.x, w, POSTER_CANVAS.width);
    const y = clampAxis(edit.y, h, POSTER_CANVAS.height);
    if (layer.type === "shape") return { ...layer, x, y, w, h };
    const textLayer = layer as PosterTextLayer;
    const fontSize = clampFont(edit.fontSize ?? textLayer.fontSize * (h / textLayer.h));
    return {
      ...textLayer,
      x,
      y,
      w,
      h,
      fontSize,
      text: truncateSlot(textLayer.role, edit.text ?? textLayer.text),
    };
  });
  return { ok: true, layers };
}
