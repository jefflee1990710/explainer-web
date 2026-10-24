import { fetchPublicImageBytes } from "@/service/project/reference-image-import";
import { persistBuffer } from "@/service/higgsfield/persist";
import { randomUUID } from "node:crypto";

const MAX_BYTES = 12 * 1024 * 1024;

export type DecodedImage = {
  buffer: Buffer;
  type: string;
  ext: string;
};

function extFor(type: string, hint = "") {
  if (type.includes("png") || hint.endsWith(".png")) return "png";
  if (type.includes("webp") || hint.endsWith(".webp")) return "webp";
  if (type.includes("gif") || hint.endsWith(".gif")) return "gif";
  return "jpg";
}

function typeForExt(ext: string) {
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return "image/jpeg";
}

// Decode a data URL or raw base64 payload into image bytes.
export function decodeImageBase64(imageBase64: string, mimeType?: string): DecodedImage {
  const trimmed = imageBase64.trim();
  const dataUrl = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s.exec(trimmed);
  let type = mimeType?.trim() || "";
  let raw = trimmed;
  if (dataUrl) {
    type = dataUrl[1];
    raw = dataUrl[2];
  }
  const buffer = Buffer.from(raw.replace(/\s+/g, ""), "base64");
  if (!buffer.length) throw new Error("圖片內容是空的");
  if (buffer.length > MAX_BYTES) throw new Error("圖片大小不可超過 12MB");
  if (!type) {
    if (buffer[0] === 0x89 && buffer[1] === 0x50) type = "image/png";
    else if (buffer[0] === 0xff && buffer[1] === 0xd8) type = "image/jpeg";
    else if (buffer[0] === 0x52 && buffer[1] === 0x49) type = "image/webp";
    else type = "image/jpeg";
  }
  if (!type.startsWith("image/")) throw new Error("只支援圖片檔");
  const ext = extFor(type);
  return { buffer, type: typeForExt(ext), ext };
}

// Load image bytes from a public https URL or base64 / data URL.
export async function loadAgentImage(input: {
  imageUrl?: string;
  imageBase64?: string;
  mimeType?: string;
}): Promise<DecodedImage> {
  if (input.imageBase64?.trim()) {
    return decodeImageBase64(input.imageBase64, input.mimeType);
  }
  const url = input.imageUrl?.trim() || "";
  if (!url) throw new Error("請提供 imageUrl 或 imageBase64");
  if (url.startsWith("data:image/")) {
    return decodeImageBase64(url);
  }
  const downloaded = await fetchPublicImageBytes(url);
  if (downloaded.buffer.length > MAX_BYTES) throw new Error("圖片大小不可超過 12MB");
  const type = downloaded.type || "image/jpeg";
  const ext = extFor(type, url.toLowerCase().split("?")[0]);
  return { buffer: downloaded.buffer, type: typeForExt(ext), ext };
}

export function imageToFormFile(image: DecodedImage, filename = "upload") {
  return new File([image.buffer], `${filename}.${image.ext}`, { type: image.type });
}

// Host a base64/URL image on the account blob so later tools can reuse the https URL.
export async function persistAgentImage(
  clerkUserId: string,
  image: DecodedImage,
  folder = "mcp-uploads",
) {
  const key = `explainer/${folder}/${clerkUserId}/${Date.now()}-${randomUUID()}.${image.ext}`;
  const url = await persistBuffer(image.buffer, key, image.type);
  return { url, ...image };
}
