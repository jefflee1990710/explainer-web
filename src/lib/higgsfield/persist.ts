import { put } from "@vercel/blob";

// Copy a generated file from the provider CDN into Vercel Blob so the URL
// is permanent and under our control. Provider URLs expire, so a missing
// token is a hard error rather than a silent fallback.
export async function persistMedia(url: string, pathname: string) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("尚未設定 BLOB_READ_WRITE_TOKEN，無法保存生成檔案");
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("無法下載生成檔案");
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") || undefined;
  const blob = await put(pathname, buffer, {
    access: "public",
    contentType,
    // Provider request ids are unique; keep deterministic paths for retries.
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return blob.url;
}
