import { readdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";

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

/**
 * Remove temporary input media, H3 chain checkpoints (~0.88 GB per job), and exported `.mp4`
 * copies on the local ComfyUI filesystem once a job has been persisted to Vercel Blob (or failed).
 */
export async function cleanupComfyLocalJobFiles(
  targetId: string,
  comfyRootDir = process.env.COMFY_ROOT_DIR?.trim() || "/workspace/ComfyUI",
): Promise<void> {
  const cleanId = targetId.trim();
  if (!cleanId || cleanId.length < 4) return;

  const dirsToScan = [
    join(comfyRootDir, "input"),
    join(comfyRootDir, "output", "h3_chains"),
    join(comfyRootDir, "output", "h3_oneclick_swap"),
    join(comfyRootDir, "output", "h3_oneclick_edit"),
    join(comfyRootDir, "output", "h3_oneclick_extend"),
  ];

  await Promise.all(
    dirsToScan.map(async (dir) => {
      const entries = await readdir(dir).catch(() => [] as string[]);
      await Promise.all(
        entries
          .filter((name) => name.includes(cleanId))
          .map((name) =>
            rm(join(dir, name), { recursive: true, force: true }).catch(() => {}),
          ),
      );
    }),
  );
}

/**
 * Periodically prune any orphaned ComfyUI input/output files older than `maxAgeMs` (default 6h).
 */
export async function cleanupStaleComfyFiles(
  comfyRootDir = process.env.COMFY_ROOT_DIR?.trim() || "/workspace/ComfyUI",
  maxAgeMs = 6 * 60 * 60 * 1000,
): Promise<void> {
  const cutoffMs = Date.now() - maxAgeMs;
  const dirsToScan = [
    join(comfyRootDir, "input"),
    join(comfyRootDir, "output", "h3_chains"),
    join(comfyRootDir, "output", "h3_oneclick_swap"),
    join(comfyRootDir, "output", "h3_oneclick_edit"),
    join(comfyRootDir, "output", "h3_oneclick_extend"),
  ];

  await Promise.all(
    dirsToScan.map(async (dir) => {
      const entries = await readdir(dir).catch(() => [] as string[]);
      await Promise.all(
        entries.map(async (name) => {
          const fullPath = join(dir, name);
          const info = await stat(fullPath).catch(() => null);
          if (info && info.mtimeMs < cutoffMs) {
            await rm(fullPath, { recursive: true, force: true }).catch(() => {});
          }
        }),
      );
    }),
  );
}
