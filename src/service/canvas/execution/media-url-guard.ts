// Only Vercel Blob (where every canvas output and upload lives) and hosts listed in
// CANVAS_MEDIA_ALLOWED_HOSTS may be downloaded or probed, so a crafted node URL
// cannot make the worker fetch internal addresses (SSRF).

const BLOB_HOST = /(^|\.)blob\.vercel-storage\.com$/i;

// "host" or "host:port", comma separated. Local dev sets its fake Blob host here.
type MediaUrlEnv = Record<string, string | undefined>;

function extraAllowedHosts(env: MediaUrlEnv): string[] {
  return (env.CANVAS_MEDIA_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedCanvasMediaUrl(raw: string, env: MediaUrlEnv = process.env): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.username || url.password) return false;
  const extra = extraAllowedHosts(env);
  if (extra.includes(url.host.toLowerCase()) || extra.includes(url.hostname.toLowerCase())) {
    return url.protocol === "https:" || url.protocol === "http:";
  }
  return url.protocol === "https:" && !url.port && BLOB_HOST.test(url.hostname);
}

export function assertAllowedCanvasMediaUrl(raw: string, env: MediaUrlEnv = process.env): void {
  if (!isAllowedCanvasMediaUrl(raw, env)) {
    throw new Error("輸入媒體的網址不在允許的來源內，請重新上傳或重新產生該節點");
  }
}
