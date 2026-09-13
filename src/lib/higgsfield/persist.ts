import { put } from "@vercel/blob";

// Copy a remote Higgsfield file to Vercel Blob when a token exists.
export async function persistMedia(url: string, pathname: string) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return url;
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
  });
  return blob.url;
}
