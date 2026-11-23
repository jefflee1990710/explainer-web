import type { GenerationKind } from "@/model/generation-job";

export type OutputMediaKind = "image" | "video" | "audio";

export type OutputListItem = {
  id: string;
  kind: OutputMediaKind;
  title: string;
  url: string;
  createdAt: string;
};

// One finished file. A blank url is not a result the list can open.
export function outputItem(input: {
  id: string;
  kind: OutputMediaKind;
  title: string;
  url?: string;
  createdAt: Date | string;
}): OutputListItem | null {
  const url = input.url?.trim();
  if (!url) return null;
  const createdAt =
    input.createdAt instanceof Date ? input.createdAt.toISOString() : input.createdAt;
  const title = input.title.trim() || url;
  return { id: input.id, kind: input.kind, title, url, createdAt };
}

// Newest first. The same file stored on two records stays as one row.
export function mergeOutputItems(
  items: Array<OutputListItem | null>,
  limit: number,
): OutputListItem[] {
  const sorted = items
    .flatMap((item) => (item ? [item] : []))
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
  const seen = new Set<string>();
  const merged: OutputListItem[] = [];
  for (const item of sorted) {
    if (seen.has(item.url)) continue;
    seen.add(item.url);
    merged.push(item);
    if (merged.length >= limit) break;
  }
  return merged;
}

// Storyboard jobs are pictures, except the clip render itself.
export function generationMediaKind(kind: GenerationKind): OutputMediaKind {
  return kind === "video" ? "video" : "image";
}

// Extension wins when a record does not say what the file is.
export function kindFromMediaUrl(url: string, fallback: OutputMediaKind): OutputMediaKind {
  const path = url.split("?")[0]?.toLowerCase() ?? "";
  if (/\.(mp4|webm|mov|m4v)$/.test(path)) return "video";
  if (/\.(mp3|wav|m4a|ogg|aac)$/.test(path)) return "audio";
  if (/\.(png|jpe?g|webp|gif)$/.test(path)) return "image";
  return fallback;
}
