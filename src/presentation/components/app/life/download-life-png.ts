// Build a clean .png filename for a downloaded Life photo.
export function buildLifePngFilename(input: {
  characterName?: string;
  place?: string;
  id?: string;
}) {
  const parts = [input.characterName, input.place, input.id?.slice(-6)]
    .map((part) =>
      (part ?? "")
        .trim()
        .replace(/[\\/:*?"<>|]+/g, "")
        .replace(/\s+/g, "-")
        .slice(0, 32),
    )
    .filter(Boolean);
  const stem = (parts.join("-") || "life-shot").replace(/\.png$/i, "");
  return `${stem}.png`;
}

// Convert a fetched image Blob to image/png when the source is JPEG or WebP.
async function ensurePngBlob(source: Blob): Promise<Blob> {
  if (source.type === "image/png") return source;
  const bitmap = await createImageBitmap(source);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("無法轉換為 PNG");
    ctx.drawImage(bitmap, 0, 0);
    const pngBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (!pngBlob) throw new Error("無法轉換為 PNG");
    return pngBlob;
  } finally {
    bitmap.close();
  }
}

// Fetch a remote Life photo, convert to PNG if needed, and trigger a browser download.
export async function downloadLifeShotAsPng(input: {
  url: string;
  characterName?: string;
  place?: string;
  id?: string;
}) {
  const response = await fetch(input.url);
  if (!response.ok) throw new Error("下載失敗，請再試一次");
  const pngBlob = await ensurePngBlob(await response.blob());
  const objectUrl = URL.createObjectURL(pngBlob);
  try {
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = buildLifePngFilename(input);
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
