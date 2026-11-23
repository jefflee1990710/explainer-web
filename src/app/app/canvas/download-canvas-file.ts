// Turns a canvas output URL into a local download. Blob hosts are cross-origin,
// so an <a download> link opens the file instead of saving it.

const KIND_EXTENSION = {
  video: "mp4",
  audio: "mp3",
  image: "png",
} as const;

export type CanvasDownloadKind = keyof typeof KIND_EXTENSION;

function fileExtension(name: string): string | undefined {
  const match = name.match(/\.([a-z0-9]{2,5})$/i);
  return match?.[1]?.toLowerCase();
}

function extensionFromUrl(url: string): string | undefined {
  try {
    return fileExtension(new URL(url).pathname);
  } catch {
    return fileExtension(url.split("?")[0] ?? url);
  }
}

function cleanTitle(title: string | undefined): string {
  return (title ?? "")
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

// File name shown in the browser save dialog: "{project} - {node}.ext".
export function canvasDownloadFilename(
  project: string | undefined,
  node: string | undefined,
  url: string,
  kind: CanvasDownloadKind,
): string {
  const projectName = cleanTitle(project);
  const nodeName = cleanTitle(node);
  const base = [projectName, nodeName].filter(Boolean).join(" - ");
  if (base && fileExtension(base)) return base;
  const ext = extensionFromUrl(url) ?? KIND_EXTENSION[kind];
  return `${base || "canvas-output"}.${ext}`;
}

// Fetches the output and hands a same-origin blob to the browser download.
export async function downloadCanvasFile(url: string, filename: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("download failed");
  const href = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
}
