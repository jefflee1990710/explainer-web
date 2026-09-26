import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ffmpegPath from "ffmpeg-static";

export const CLIP_EDGE_FADE_SEC = 0.1;

// Fade video + audio out at the end of clip N and in at the start of clip N+1.
export function buildEdgeFadeFilter(
  durations: number[],
  hasAudio: boolean[],
  fadeSec = CLIP_EDGE_FADE_SEC,
): string {
  if (durations.length < 2) return "";
  const audio = hasAudio.length === durations.length && hasAudio.every(Boolean);
  const parts: string[] = [];
  const concatPads: string[] = [];

  for (let i = 0; i < durations.length; i += 1) {
    const fade = Math.min(fadeSec, durations[i] / 2);
    const outAt = Math.max(0, roundFade(durations[i] - fade));
    const fadeD = roundFade(fade);
    const vFades: string[] = [];
    const aFades: string[] = [];
    if (i > 0) {
      vFades.push(`fade=t=in:st=0:d=${fadeD}`);
      aFades.push(`afade=t=in:st=0:d=${fadeD}`);
    }
    if (i < durations.length - 1) {
      vFades.push(`fade=t=out:st=${outAt}:d=${fadeD}`);
      aFades.push(`afade=t=out:st=${outAt}:d=${fadeD}`);
    }
    parts.push(`[${i}:v]${vFades.join(",") || "null"}[v${i}]`);
    if (audio) parts.push(`[${i}:a]${aFades.join(",") || "anull"}[a${i}]`);
    concatPads.push(`[v${i}]`);
    if (audio) concatPads.push(`[a${i}]`);
  }

  parts.push(
    `${concatPads.join("")}concat=n=${durations.length}:v=1:a=${audio ? 1 : 0}${
      audio ? "[v][a]" : "[v]"
    }`,
  );
  return parts.join(";");
}

function roundFade(value: number) {
  return Math.round(value * 1000) / 1000;
}

// Concat storyboard clips in order with 100ms fades on every clip edge.
export async function concatMp4Urls(urls: string[]): Promise<Buffer> {
  if (urls.length === 0) throw new Error("沒有可合成的片段");
  if (urls.length === 1) return fetchBuffer(urls[0], "片段");
  const buffers = [];
  for (let i = 0; i < urls.length; i += 1) {
    buffers.push(await fetchBuffer(urls[i], `第 ${i + 1} 段`));
  }
  return concatMp4Buffers(buffers);
}

export async function concatMp4Buffers(buffers: Buffer[]): Promise<Buffer> {
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
    const probes = [];
    for (const name of names) probes.push(await probeClip(dir, name));
    const filter = buildEdgeFadeFilter(
      probes.map((item) => item.duration),
      probes.map((item) => item.hasAudio),
    );
    const out = join(dir, "reel.mp4");
    const args = ["-y"];
    for (const name of names) args.push("-i", name);
    args.push(
      "-filter_complex",
      filter,
      "-map",
      "[v]",
    );
    if (probes.every((item) => item.hasAudio)) {
      args.push("-map", "[a]", "-c:a", "aac", "-ac", "2");
    }
    args.push(
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      "reel.mp4",
    );
    await runFfmpeg(dir, args);
    return await readFile(out);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function probeClip(cwd: string, name: string) {
  const stderr = await ffmpegStderr(cwd, ["-i", name]);
  const match = stderr.match(/Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!match) throw new Error(`無法讀取 ${name} 時長`);
  const duration =
    Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
  return { duration, hasAudio: /Audio:/.test(stderr) };
}

function ffmpegStderr(cwd: string, args: string[]) {
  return new Promise<string>((resolve, reject) => {
    if (!ffmpegPath) {
      reject(new Error("找不到 ffmpeg，無法合成成片"));
      return;
    }
    const child = spawn(ffmpegPath, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", () => resolve(stderr));
  });
}

async function fetchBuffer(url: string, label: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`無法下載${label}（${response.status}）`);
  return Buffer.from(await response.arrayBuffer());
}

function runFfmpeg(cwd: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    if (!ffmpegPath) {
      reject(new Error("找不到 ffmpeg，無法合成成片"));
      return;
    }
    const child = spawn(ffmpegPath, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(stderr.trim().split("\n").slice(-3).join(" ") || `ffmpeg 結束碼 ${code}`));
    });
  });
}
