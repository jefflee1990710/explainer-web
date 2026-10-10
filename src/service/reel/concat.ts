import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import ffmpegPath from "ffmpeg-static";
import { joinPadArgs } from "@/service/reel/join-pad";
import type { PairwiseStep } from "@/service/reel/pairwise-progress";
import { REEL_TIMEOUT_MESSAGE } from "@/service/reel/timeout";
import { mapLimit } from "@/util/map-limit";

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

// Clips download at the same time, straight to disk.
const DOWNLOAD_LIMIT = 4;
// Pads are tiny encodes; a few run side by side.
const PAD_LIMIT = 3;

function clipName(index: number) {
  return `clip${String(index).padStart(3, "0")}.mp4`;
}

// Concat storyboard clips in order by remuxing the original files.
// All clips download in parallel to a temp dir, then one stream copy writes the reel.
// timeoutMs covers the whole download plus the join, not each clip separately.
export async function concatMp4Urls(
  urls: string[],
  timeoutMs?: number,
  onProgress?: (step: PairwiseStep) => void,
): Promise<Buffer> {
  if (urls.length === 0) throw new Error("沒有可合成的片段");
  const started = Date.now();
  const total = urls.length;
  onProgress?.({ current: 1, total, phase: "download" });
  if (total === 1) return fetchBuffer(urls[0], "片段", remainingMs(timeoutMs, started));

  const dir = await mkdtemp(join(tmpdir(), "reel-"));
  try {
    let done = 0;
    const names = await mapLimit(urls, DOWNLOAD_LIMIT, async (url, index) => {
      const name = clipName(index);
      await downloadToFile(url, join(dir, name), `第 ${index + 1} 段`, remainingMs(timeoutMs, started));
      done += 1;
      onProgress?.({ current: Math.min(total, done + 1), total, phase: "download" });
      return name;
    });
    onProgress?.({ current: total, total, phase: "join" });
    return await concatFilesInDir(dir, names, () => remainingMs(timeoutMs, started));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export async function concatMp4Buffers(buffers: Buffer[], timeoutMs?: number): Promise<Buffer> {
  if (buffers.length === 0) throw new Error("沒有可合成的片段");
  if (buffers.length === 1) return buffers[0];

  const started = Date.now();
  const dir = await mkdtemp(join(tmpdir(), "reel-"));
  try {
    const names: string[] = [];
    for (let i = 0; i < buffers.length; i += 1) {
      names.push(clipName(i));
      await writeFile(join(dir, names[i]), buffers[i]);
    }
    return await concatFilesInDir(dir, names, () => remainingMs(timeoutMs, started));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// Hold each clip's last frame for 200ms, then stream copy everything in one pass.
async function concatFilesInDir(dir: string, names: string[], timeLeft: () => number | undefined) {
  const pads = await mapLimit(names.slice(0, -1), PAD_LIMIT, async (name, index) => {
    const pad = `pad${String(index).padStart(3, "0")}.mp4`;
    const stderr = await ffmpegStderr(dir, ["-i", name], timeLeft());
    await runFfmpeg(dir, joinPadArgs(name, pad, stderr), timeLeft());
    return pad;
  });
  const list = names.flatMap((name, index) => (index < pads.length ? [name, pads[index]] : [name]));
  await writeFile(join(dir, "list.txt"), list.map((name) => `file '${name}'`).join("\n"));
  await runFfmpeg(
    dir,
    ["-y", "-f", "concat", "-safe", "0", "-i", "list.txt", "-c", "copy", "-movflags", "+faststart", "reel.mp4"],
    timeLeft(),
  );
  return readFile(join(dir, "reel.mp4"));
}

// Stream a remote file to disk so large clips never sit in memory as a Buffer.
async function downloadToFile(url: string, dest: string, label: string, timeoutMs?: number) {
  try {
    const response = await fetch(url, timeoutMs ? { signal: AbortSignal.timeout(timeoutMs) } : undefined);
    if (!response.ok || !response.body) throw new Error(`無法下載${label}（${response.status}）`);
    await pipeline(Readable.fromWeb(response.body as WebReadableStream), createWriteStream(dest));
  } catch (error) {
    throw timeoutError(error);
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
