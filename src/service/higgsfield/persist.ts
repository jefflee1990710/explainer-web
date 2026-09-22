import { put } from "@vercel/blob";

export type PersistMediaOptions = {
  transform?: (buffer: Buffer) => Promise<Buffer>;
  // Overrides the source's content-type header, e.g. when `transform`
  // re-encodes a PNG as WebP.
  contentType?: string;
};

// Copy a generated file from the provider CDN into Vercel Blob so the URL
// is permanent and under our control. Provider URLs expire, so a missing
// token is a hard error rather than a silent fallback.
export async function persistMedia(
  url: string,
  pathname: string,
  options?: PersistMediaOptions,
) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("尚未設定 BLOB_READ_WRITE_TOKEN，無法保存生成檔案");
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("無法下載生成檔案");
  }
  let buffer = Buffer.from(await response.arrayBuffer());
  if (options?.transform) {
    buffer = Buffer.from(await options.transform(buffer));
  }
  const contentType =
    options?.contentType || response.headers.get("content-type") || undefined;
  const blob = await put(pathname, buffer, {
    access: "public",
    contentType,
    // Provider request ids are unique; keep deterministic paths for retries.
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return blob.url;
}

// Upload an already-fetched buffer (e.g. a concatenated reel) to Blob.
export async function persistBuffer(
  buffer: Buffer,
  pathname: string,
  contentType: string,
) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("尚未設定 BLOB_READ_WRITE_TOKEN，無法保存生成檔案");
  }
  const blob = await put(pathname, buffer, {
    access: "public",
    contentType,
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return blob.url;
}
