import type { OpencutEditMedia } from "@/model/opencut-edit";

const MEDIA_TYPES = new Set(["image", "video", "audio"]);
const MAX_MEDIA = 80;
const MAX_JSON = 4_000_000;

function httpUrl(value: unknown) {
  if (typeof value !== "string" || value.length > 2000) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function stripHeavy(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripHeavy);
  if (!value || typeof value !== "object") return value;
  const next: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (key === "buffer" || key === "file" || key === "thumbnail" || key === "thumbnailUrl") continue;
    // Block Mongo operator keys ($set, $where, etc.), but preserve dotted OpenCut param keys
    // such as "transform.positionX", "transform.positionY", "transform.scaleX", and "background.enabled".
    if (key.startsWith("$")) continue;
    next[key] = stripHeavy(item);
  }
  return next;
}

function mediaItem(value: unknown): OpencutEditMedia | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const sourceUrl = httpUrl(raw.sourceUrl);
  if (!sourceUrl) return null;
  if (typeof raw.id !== "string" || raw.id.length < 8 || raw.id.length > 80) return null;
  if (typeof raw.name !== "string" || !raw.name.trim() || raw.name.length > 200) return null;
  if (typeof raw.type !== "string" || !MEDIA_TYPES.has(raw.type)) return null;
  const item: OpencutEditMedia = {
    id: raw.id,
    name: raw.name.trim(),
    type: raw.type as OpencutEditMedia["type"],
    sourceUrl,
  };
  if (typeof raw.width === "number" && Number.isFinite(raw.width)) item.width = raw.width;
  if (typeof raw.height === "number" && Number.isFinite(raw.height)) item.height = raw.height;
  if (typeof raw.duration === "number" && Number.isFinite(raw.duration)) item.duration = raw.duration;
  return item;
}

// Drop file bytes and thumbnails. Mongo keeps the timeline and the Blob URLs.
export function sanitizeOpencutEdit(input: {
  project: unknown;
  media: unknown;
}): { project: Record<string, unknown>; media: OpencutEditMedia[] } | null {
  if (!input.project || typeof input.project !== "object" || Array.isArray(input.project)) return null;
  const project = stripHeavy(input.project) as Record<string, unknown>;
  if (!project.metadata || typeof project.metadata !== "object") return null;
  const media = (Array.isArray(input.media) ? input.media : [])
    .slice(0, MAX_MEDIA)
    .map(mediaItem)
    .filter((item): item is OpencutEditMedia => item !== null);
  if (JSON.stringify({ project, media }).length > MAX_JSON) return null;
  return { project, media };
}
