import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import ffmpegStaticPath from "ffmpeg-static";

export type VideoEncoderMode = "cpu" | "nvenc";

let cachedMode: VideoEncoderMode =
  process.env.FFMPEG_VIDEO_ENCODER?.trim().toLowerCase() === "nvenc" ? "nvenc" : "cpu";
let cachedSystemFfmpeg: string | null = null;

export function getVideoEncoderMode(): VideoEncoderMode {
  return cachedMode;
}

export function setVideoEncoderModeForTests(mode: VideoEncoderMode) {
  cachedMode = mode;
}

export function resetVideoEncoderCacheForTests() {
  cachedMode =
    process.env.FFMPEG_VIDEO_ENCODER?.trim().toLowerCase() === "nvenc" ? "nvenc" : "cpu";
}

const DEFAULT_SYSTEM_FFMPEG_CANDIDATES = [
  "/usr/local/bin/ffmpeg",
  "/usr/bin/ffmpeg",
  "/opt/homebrew/bin/ffmpeg",
];

/**
 * Prefer system `/usr/bin/ffmpeg` on Linux worker hosts when NVENC is active or when
 * `FFMPEG_PATH` is explicitly configured; otherwise fall back to `ffmpeg-static` (only if
 * the binary actually exists on disk) and then system `ffmpeg`.
 */
export function resolveFfmpegBinary(options?: {
  ffmpegStatic?: string | null;
  systemCandidates?: readonly string[];
}): string {
  const envPath = process.env.FFMPEG_PATH?.trim();
  if (envPath && existsSync(envPath)) return envPath;

  const systemCandidates =
    options?.systemCandidates ?? DEFAULT_SYSTEM_FFMPEG_CANDIDATES;
  const staticCandidate =
    options?.ffmpegStatic !== undefined ? options.ffmpegStatic : ffmpegStaticPath;

  if (cachedMode === "nvenc") {
    if (!options?.systemCandidates) {
      cachedSystemFfmpeg ??=
        systemCandidates.find((p) => existsSync(p)) ?? null;
      if (cachedSystemFfmpeg) return cachedSystemFfmpeg;
    } else {
      const found = systemCandidates.find((p) => existsSync(p));
      if (found) return found;
    }
  }

  if (staticCandidate && existsSync(staticCandidate)) return staticCandidate;

  const sysFound = systemCandidates.find((p) => existsSync(p));
  if (sysFound) return sysFound;

  return "ffmpeg";
}

export function buildVideoCodecArgs(options?: {
  pixFmt?: string;
  mode?: VideoEncoderMode;
}): string[] {
  const mode = options?.mode ?? cachedMode;
  const out =
    mode === "nvenc"
      ? ["-c:v", "h264_nvenc", "-preset", "p4", "-cq", "20"]
      : ["-c:v", "libx264"];
  if (options?.pixFmt) {
    out.push("-pix_fmt", options.pixFmt);
  }
  return out;
}

const X264_PRESETS = new Set([
  "ultrafast",
  "superfast",
  "veryfast",
  "faster",
  "fast",
  "medium",
  "slow",
  "slower",
  "veryslow",
]);

/**
 * Rewrites an FFmpeg argument array targeting `libx264` to `h264_nvenc` when GPU encoding
 * is active, mapping `-crf` to `-cq` and x264 presets to NVENC `p4`.
 */
export function rewriteArgsForNvenc(
  args: readonly string[],
  mode: VideoEncoderMode = cachedMode,
): string[] {
  if (mode !== "nvenc") return [...args];
  const hasLibx264 = args.some(
    (arg, idx) => arg === "libx264" && (args[idx - 1] === "-c:v" || args[idx - 1] === "-vcodec"),
  );
  if (!hasLibx264) return [...args];

  const out: string[] = [];
  let hasPreset = false;
  for (let i = 0; i < args.length; i += 1) {
    const token = args[i]!;
    const next = args[i + 1];
    if ((token === "-c:v" || token === "-vcodec") && next === "libx264") {
      out.push(token, "h264_nvenc");
      i += 1;
      continue;
    }
    if (token === "-crf" && next !== undefined) {
      out.push("-cq", next);
      i += 1;
      continue;
    }
    if (token === "-preset" && next !== undefined) {
      hasPreset = true;
      out.push("-preset", X264_PRESETS.has(next) ? "p4" : next);
      i += 1;
      continue;
    }
    out.push(token);
  }

  if (!hasPreset) {
    const codecIdx = out.findIndex(
      (arg, idx) => arg === "h264_nvenc" && (out[idx - 1] === "-c:v" || out[idx - 1] === "-vcodec"),
    );
    if (codecIdx !== -1) {
      out.splice(codecIdx + 1, 0, "-preset", "p4");
    }
  }
  return out;
}

async function defaultRunNvencProbe(): Promise<boolean> {
  const candidates = [
    process.env.FFMPEG_PATH?.trim(),
    "/usr/local/bin/ffmpeg",
    "/usr/bin/ffmpeg",
    ffmpegStaticPath ?? undefined,
  ].filter((v): v is string => Boolean(v && existsSync(v)));

  for (const bin of candidates) {
    const ok = await new Promise<boolean>((resolve) => {
      const child = spawn(
        bin,
        [
          "-hide_banner",
          "-loglevel",
          "error",
          "-f",
          "lavfi",
          "-i",
          "color=c=black:s=256x256:d=0.1:r=24",
          "-pix_fmt",
          "yuv420p",
          "-c:v",
          "h264_nvenc",
          "-f",
          "null",
          "-",
        ],
        { stdio: ["ignore", "ignore", "ignore"] },
      );
      const timer = setTimeout(() => {
        child.kill("SIGKILL");
        resolve(false);
      }, 5000);
      child.on("error", () => {
        clearTimeout(timer);
        resolve(false);
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        resolve(code === 0);
      });
    });
    if (ok) {
      cachedSystemFfmpeg = bin;
      return true;
    }
  }
  return false;
}

/**
 * Probes whether the current machine can open a real `h264_nvenc` hardware encode session.
 * Caches the result in-process so subsequent `runFfmpeg` calls use NVENC automatically.
 */
export async function probeNvencSupport(options?: {
  runProbe?: () => Promise<boolean>;
}): Promise<VideoEncoderMode> {
  if (process.env.FFMPEG_VIDEO_ENCODER?.trim().toLowerCase() === "cpu") {
    cachedMode = "cpu";
    return cachedMode;
  }
  const runProbe = options?.runProbe ?? defaultRunNvencProbe;
  const supported = await runProbe().catch(() => false);
  cachedMode = supported ? "nvenc" : "cpu";
  return cachedMode;
}
