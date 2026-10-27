import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ffmpegStderr, runFfmpeg } from "@/service/reel/concat";
import { parseSpeechWindowFromStderr } from "@/service/voice/elevenlabs";

// Same breath the editor's Smooth Silence keeps in front of and behind speech
// (scro-smooth-silence-pack.ts naturalSpeechTrim). The file itself is trimmed,
// so the timeline plays the full clip and does not cut again.
export const SMOOTH_SILENCE_HEAD_KEEP_SECONDS = 0.22;
export const SMOOTH_SILENCE_TAIL_KEEP_SECONDS = 0.32;
const MIN_VISIBLE_SECONDS = 0.5;
const MIN_TRIM_SECONDS = 0.04;
const EDGE_FADE_SECONDS = 0.015;

export type SmoothSilenceWindow = {
  duration: number;
  start: number;
  end: number;
};

export type SmoothSilenceCut = {
  startSeconds: number;
  durationSeconds: number;
};

// How much leading/trailing dead air to drop, leaving a short breath.
// Returns null when the clip is already tight or too short to cut safely.
export function smoothSilenceCut(window: SmoothSilenceWindow): SmoothSilenceCut | null {
  const duration = Math.max(0, window.duration);
  if (duration < MIN_VISIBLE_SECONDS) return null;
  const leading = Math.max(0, Math.min(duration, window.start));
  const trailing = Math.max(0, duration - Math.min(duration, Math.max(leading, window.end)));
  const trimStart = Math.max(
    0,
    Math.min(duration - MIN_VISIBLE_SECONDS, leading - SMOOTH_SILENCE_HEAD_KEEP_SECONDS),
  );
  const trimEnd = Math.max(
    0,
    Math.min(
      duration - trimStart - MIN_VISIBLE_SECONDS,
      trailing - SMOOTH_SILENCE_TAIL_KEEP_SECONDS,
    ),
  );
  const startSeconds = Math.round(trimStart * 1000) / 1000;
  const endCut = Math.round(trimEnd * 1000) / 1000;
  if (startSeconds <= MIN_TRIM_SECONDS && endCut <= MIN_TRIM_SECONDS) return null;
  const durationSeconds = Math.round((duration - startSeconds - endCut) * 1000) / 1000;
  if (durationSeconds < MIN_VISIBLE_SECONDS) return null;
  return { startSeconds, durationSeconds };
}

function fmtSeconds(value: number) {
  return value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

// Re-encode the kept span so picture and swapped voice stay locked, with a short edge fade.
export function smoothSilenceTrimArgs(
  inPath: string,
  outPath: string,
  cut: SmoothSilenceCut,
): string[] {
  const start = fmtSeconds(cut.startSeconds);
  const end = fmtSeconds(cut.startSeconds + cut.durationSeconds);
  const fadeOutAt = fmtSeconds(Math.max(0, cut.durationSeconds - EDGE_FADE_SECONDS));
  return [
    "-y",
    "-i",
    inPath,
    "-vf",
    `trim=start=${start}:end=${end},setpts=PTS-STARTPTS,setsar=1`,
    "-af",
    `atrim=start=${start}:end=${end},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=${fmtSeconds(EDGE_FADE_SECONDS)},afade=t=out:st=${fadeOutAt}:d=${fmtSeconds(EDGE_FADE_SECONDS)}`,
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    "-crf",
    "17",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-movflags",
    "+faststart",
    outPath,
  ];
}

// Drop leading/trailing dead air from a finished lip-sync clip. Unchanged when
// speech already fills the file or ffmpeg cannot see an audio track.
export async function trimClipSmoothSilence(buffer: Buffer): Promise<Buffer> {
  const dir = await mkdtemp(join(tmpdir(), "smooth-silence-"));
  try {
    await writeFile(join(dir, "in.mp4"), buffer);
    const probe = await ffmpegStderr(dir, [
      "-i",
      "in.mp4",
      "-af",
      "silencedetect=noise=-32dB:d=0.08",
      "-f",
      "null",
      "-",
    ]);
    if (!/Audio:/.test(probe)) return buffer;
    const cut = smoothSilenceCut(parseSpeechWindowFromStderr(probe));
    if (!cut) return buffer;
    await runFfmpeg(dir, smoothSilenceTrimArgs("in.mp4", "out.mp4", cut));
    console.info("[smooth-silence] trimmed clip", {
      startSeconds: cut.startSeconds,
      durationSeconds: cut.durationSeconds,
    });
    return await readFile(join(dir, "out.mp4"));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
