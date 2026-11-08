export type LocalComfyStatus = {
  ok: boolean;
  url: string;
  deviceName?: string;
  vramTotalBytes?: number;
  error?: string;
};

export async function checkLocalComfyUi(
  baseUrl = process.env.COMFY_LOCAL_URL?.trim() || "http://127.0.0.1:8188",
  fetchFn: typeof fetch = fetch,
): Promise<LocalComfyStatus> {
  const cleanUrl = baseUrl.replace(/\/+$/, "");
  try {
    const res = await fetchFn(`${cleanUrl}/system_stats`, {
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) {
      return { ok: false, url: cleanUrl, error: `HTTP ${res.status}` };
    }
    const body = (await res.json()) as {
      devices?: Array<{ name?: string; vram_total?: number }>;
    };
    const dev = body.devices?.[0];
    return {
      ok: true,
      url: cleanUrl,
      deviceName: dev?.name,
      vramTotalBytes: dev?.vram_total,
    };
  } catch (error) {
    return {
      ok: false,
      url: cleanUrl,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
