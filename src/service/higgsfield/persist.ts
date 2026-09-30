import { put } from "@vercel/blob";

export type WaitForPublicUrlOptions = {
  tries?: number;
  delayMs?: number;
  fetch?: typeof fetch;
};

// put() can return before the object is readable; a first <img> GET 404s
// and the browser will not retry without a remount or cache-bust.
export async function waitForPublicUrl(url: string, options?: WaitForPublicUrlOptions) {
  const tries = options?.tries ?? 5;
  const delayMs = options?.delayMs ?? 200;
  const fetchFn = options?.fetch ?? fetch;
  for (let attempt = 1; attempt <= tries; attempt += 1) {
    try {
      const response = await fetchFn(url);
      if (response.ok) return true;
    } catch {
      // Transient 404 / network blip — try again.
    }
    if (attempt < tries && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return false;
}

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
  const ready = await waitForPublicUrl(blob.url);
  if (!ready) {
    console.warn("[persist] blob not readable yet", { pathname });
  }
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
  const ready = await waitForPublicUrl(blob.url);
  if (!ready) {
    console.warn("[persist] blob not readable yet", { pathname });
  }
  return blob.url;
}
