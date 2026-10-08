import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ffmpegPath from "ffmpeg-static";
import type { PairwiseStep } from "@/service/reel/pairwise-progress";
import { REEL_TIMEOUT_MESSAGE } from "@/service/reel/timeout";

function timeoutError(error: unknown) {
  if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
    return new Error(REEL_TIMEOUT_MESSAGE);
  }
  return error;
}

function remainingMs(timeoutMs: number | undefined, started: number) {
  if (timeoutMs == null) return undefined;
  const left = timeoutMs - (Date.now() - started);
  if (left <= 0) throw new Error(REEL_TIMEOUT_MESSAGE);
  return left;
}

// Concat storyboard clips in order by remuxing the original files.
// Each step joins the running result with the next clip, so only two files are in memory.
// timeoutMs covers the whole download plus the join, not each clip separately.
export async function concatMp4Urls(
  urls: string[],
  timeoutMs?: number,
  onProgress?: (step: PairwiseStep) => void,
): Promise<Buffer> {
  if (urls.length === 0) throw new Error("沒有可合成的片段");
  const started = Date.now();
  const total = urls.length;
  if (total === 1) {
    onProgress?.({ current: 1, total, phase: "download" });
    return fetchBuffer(urls[0], "片段", remainingMs(timeoutMs, started));
  }
  onProgress?.({ current: 1, total, phase: "download" });
  let acc: Buffer = await fetchBuffer(urls[0], "第 1 段", remainingMs(timeoutMs, started));
  for (let index = 1; index < total; index += 1) {
    const current = index + 1;
    onProgress?.({ current, total, phase: "download" });
    const next = await fetchBuffer(urls[index], `第 ${current} 段`, remainingMs(timeoutMs, started));
    onProgress?.({ current, total, phase: "join" });
    acc = await concatMp4Buffers([acc, next], remainingMs(timeoutMs, started));
  }
  return acc;
}

export async function concatMp4Buffers(buffers: Buffer[], timeoutMs?: number): Promise<Buffer> {
  if (buffers.length === 0) throw new Error("沒有可合成的片段");
  if (buffers.length === 1) return buffers[0];

  const dir = await mkdtemp(join(tmpdir(), "reel-"));
  try {
    const names: string[] = [];
    for (let i = 0; i < buffers.length; i += 1) {
      const name = `clip${String(i).padStart(3, "0")}.mp4`;
      await writeFile(join(dir, name), buffers[i]);
      names.push(name);
    }
    // Stream copy. No fade and no second encode.
    await writeFile(join(dir, "list.txt"), names.map((name) => `file '${name}'`).join("\n"));
    const out = join(dir, "reel.mp4");
    await runFfmpeg(
      dir,
      ["-y", "-f", "concat", "-safe", "0", "-i", "list.txt", "-c", "copy", "-movflags", "+faststart", "reel.mp4"],
      timeoutMs,
    );
    return await readFile(out);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export function ffmpegStderr(cwd: string, args: string[], timeoutMs?: number) {
  return new Promise<string>((resolve, reject) => {
    if (!ffmpegPath) {
      reject(new Error("找不到 ffmpeg，無法合成成片"));
      return;
    }
    const child = spawn(ffmpegPath, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      fn();
    };
    const timer = armFfmpegTimeout(child, timeoutMs, () => finish(() => reject(new Error(REEL_TIMEOUT_MESSAGE))));
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => finish(() => reject(timeoutError(error))));
    child.on("close", () => finish(() => resolve(stderr)));
  });
}

export async function fetchBuffer(url: string, label: string, timeoutMs?: number) {
  try {
    const response = await fetch(url, timeoutMs ? { signal: AbortSignal.timeout(timeoutMs) } : undefined);
    if (!response.ok) throw new Error(`無法下載${label}（${response.status}）`);
    return Buffer.from(await response.arrayBuffer());
  } catch (error) {
    throw timeoutError(error);
  }
}

export function runFfmpeg(cwd: string, args: string[], timeoutMs?: number) {
  return new Promise<void>((resolve, reject) => {
    if (!ffmpegPath) {
      reject(new Error("找不到 ffmpeg，無法合成成片"));
      return;
    }
    const child = spawn(ffmpegPath, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      fn();
    };
    const timer = armFfmpegTimeout(child, timeoutMs, () => finish(() => reject(new Error(REEL_TIMEOUT_MESSAGE))));
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => finish(() => reject(timeoutError(error))));
    child.on("close", (code) => {
      finish(() => {
        if (code === 0) {
          resolve();
          return;
        }
        reject(new Error(stderr.trim().split("\n").slice(-3).join(" ") || `ffmpeg 結束碼 ${code}`));
      });
    });
  });
}

// Kill a hung encode. The close handler no-ops once the timeout already rejected.
function armFfmpegTimeout(
  child: ReturnType<typeof spawn>,
  timeoutMs: number | undefined,
  onTimeout: () => void,
) {
  if (timeoutMs == null) return null;
  return setTimeout(() => {
    child.kill("SIGKILL");
    onTimeout();
  }, timeoutMs);
}
