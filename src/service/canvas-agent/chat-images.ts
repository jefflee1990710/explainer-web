// Photos the user attaches in the canvas assistant. The model sees the pixels,
// and the same files are temporary assets so add_media_node can place them.

import type { CanvasLibraryAsset } from "@/model/canvas-dto";

export const CANVAS_AGENT_MAX_IMAGES = 4;

const EMPTY_IMAGE_TEXT =
  "The user attached an image and did not write a message. Look at the picture and help with the canvas.";

export type CanvasAgentModelContent =
  | string
  | Array<{ type: "text"; text: string } | { type: "image"; image: URL }>;

export type CanvasAgentModelMessage = {
  role: "user" | "assistant";
  content: CanvasAgentModelContent;
};

type ChatTurn = {
  role: "user" | "assistant";
  text: string;
  imageUrls?: readonly string[];
};

function blobPath(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) return null;
  if (parsed.port && parsed.port !== "443") return null;
  const host = parsed.hostname.toLowerCase();
  const blobHost = host === "blob.vercel-storage.com" || host.endsWith(".blob.vercel-storage.com");
  if (!blobHost) return null;
  try {
    const path = decodeURIComponent(parsed.pathname);
    if (path.includes("..") || path.includes("\\")) return null;
    return path;
  } catch {
    return null;
  }
}

// Any image we uploaded for the canvas (the model may fetch this URL).
export function isCanvasUploadUrl(url: string): boolean {
  const path = blobPath(url);
  return Boolean(path && /^\/canvas\/uploads\/[^/]+\//.test(path));
}

// This user's own upload folder. A chat turn may only attach those.
export function acceptedCanvasAgentImageUrl(url: string, clerkUserId: string): boolean {
  if (!clerkUserId || /[\\/]/.test(clerkUserId)) return false;
  const path = blobPath(url);
  return Boolean(path && path.startsWith(`/canvas/uploads/${clerkUserId}/`));
}

export function parseCanvasAgentImageUrls(
  raw: readonly string[] | undefined,
  clerkUserId: string,
): { ok: true; urls: string[] } | { ok: false; error: string } {
  if (!raw || raw.length === 0) return { ok: true, urls: [] };
  if (raw.length > CANVAS_AGENT_MAX_IMAGES) {
    return { ok: false, error: "At most 4 images" };
  }
  const urls: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string" || !acceptedCanvasAgentImageUrl(item, clerkUserId)) {
      return { ok: false, error: "Image URL is not allowed" };
    }
    urls.push(item);
  }
  return { ok: true, urls };
}

export function filterCanvasAgentImageUrls(
  raw: readonly string[] | undefined,
  clerkUserId: string,
): string[] {
  if (!raw) return [];
  const urls: string[] = [];
  for (const item of raw) {
    if (urls.length >= CANVAS_AGENT_MAX_IMAGES) break;
    if (typeof item === "string" && acceptedCanvasAgentImageUrl(item, clerkUserId)) urls.push(item);
  }
  return urls;
}

export function chatImageAssetId(index: number): string {
  return `chat-image-${index + 1}`;
}

export function chatImageAssets(urls: readonly string[]): CanvasLibraryAsset[] {
  return urls.map((url, index) => ({
    id: chatImageAssetId(index),
    source: "canvas_output",
    name: `Chat image ${index + 1}`,
    mediaKind: "image",
    url,
    createdAt: "1970-01-01T00:00:00.000Z",
  }));
}

function usableUrls(urls: readonly string[] | undefined): string[] {
  if (!urls) return [];
  const out: string[] = [];
  for (const url of urls) {
    if (out.length >= CANVAS_AGENT_MAX_IMAGES) break;
    if (isCanvasUploadUrl(url)) out.push(url);
  }
  return out;
}

function attachedNote(urls: readonly string[]): string {
  const listed = urls
    .map((url, index) => `Chat image ${index + 1} id=${chatImageAssetId(index)} url=${url}`)
    .join("; ");
  return `[Attached images, already in list_assets. Use add_media_node with the id when the canvas should use the photo. ${listed}]`;
}

function earlierNote(urls: readonly string[]): string {
  return `[Earlier attached image URLs, not in list_assets unless they are also attached on the latest message: ${urls.join(" ")}]`;
}

function imageContent(text: string, urls: readonly string[]): CanvasAgentModelContent {
  const shown = text.trim() ? text : EMPTY_IMAGE_TEXT;
  const parts: Array<{ type: "text"; text: string } | { type: "image"; image: URL }> = [
    { type: "text", text: `${shown}\n\n${attachedNote(urls)}` },
  ];
  for (const url of urls) {
    parts.push({ type: "image", image: new URL(url) });
  }
  return parts;
}

function userContent(
  text: string,
  ownUrls: readonly string[],
  activeUrls: readonly string[] | null,
): CanvasAgentModelContent {
  if (activeUrls && activeUrls.length > 0) return imageContent(text, activeUrls);
  const earlier = usableUrls(ownUrls);
  if (earlier.length === 0) return text;
  const note = earlierNote(earlier);
  return text.trim() ? `${text}\n\n${note}` : note;
}

// Newest photos win: this turn's attachments, otherwise the latest user turn that had some.
// Only those are assets and image parts. Older photos stay as URLs in the history text.
export function buildCanvasAgentModelMessages(input: {
  history: readonly ChatTurn[];
  message: string;
  imageUrls?: readonly string[];
  historyLimit: number;
}): { messages: CanvasAgentModelMessage[]; imageUrls: string[] } {
  const recent = input.history.slice(-input.historyLimit);
  while (recent[0]?.role === "assistant") recent.shift();

  const currentUrls = usableUrls(input.imageUrls);
  let activeHistory = -1;
  let assetUrls = currentUrls;
  if (assetUrls.length === 0) {
    for (let i = recent.length - 1; i >= 0; i--) {
      const turn = recent[i];
      if (turn?.role !== "user") continue;
      const found = usableUrls(turn.imageUrls);
      if (found.length > 0) {
        activeHistory = i;
        assetUrls = found;
        break;
      }
    }
  }

  const messages: CanvasAgentModelMessage[] = [
    ...recent.map((turn, index) => ({
      role: turn.role,
      content:
        turn.role === "assistant"
          ? turn.text
          : userContent(turn.text, turn.imageUrls ?? [], index === activeHistory ? assetUrls : null),
    })),
    {
      role: "user" as const,
      content: userContent(input.message, input.imageUrls ?? [], currentUrls.length > 0 ? currentUrls : null),
    },
  ];
  return { messages, imageUrls: assetUrls };
}
