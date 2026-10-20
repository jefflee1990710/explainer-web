// HeyGen Avatar IV generates a ~0.36s warmup from a neutral resting pose before
// locking onto the reference image's subtitle card and hand pose. Padding the VO
// by 450ms and trimming the first 0.40s of the returned video removes the warmup.
export const HEYGEN_WARMUP_PAD_MS = 450;
export const HEYGEN_WARMUP_TRIM_SECONDS = 0.4;

export function padAudioLeadingSilenceArgs(inPath: string, outPath: string, delayMs = HEYGEN_WARMUP_PAD_MS) {
  const ms = Math.max(0, Math.round(delayMs));
  return [
    "-y",
    "-i",
    inPath,
    "-af",
    `adelay=${ms}|${ms}`,
    "-c:a",
    "libmp3lame",
    "-b:a",
    "128k",
    outPath,
  ];
}

export function trimLeadingVideoArgs(
  inPath: string,
  outPath: string,
  trimSeconds = HEYGEN_WARMUP_TRIM_SECONDS,
) {
  return [
    "-y",
    "-ss",
    trimSeconds.toFixed(2),
    "-i",
    inPath,
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    "-crf",
    "18",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-movflags",
    "+faststart",
    outPath,
  ];
}

// Mono 44.1k WAV of the clip's soundtrack, sent to the voice changer.
export function extractSpeechArgs(source: string, out: string) {
  return ["-y", "-i", source, "-vn", "-ac", "1", "-ar", "44100", "-c:a", "pcm_s16le", out];
}

// Directly replace the clip's audio with the ElevenLabs voice track.
export const VOICE_SWAP_FILTER =
  "[1:a]aresample=44100,aformat=channel_layouts=stereo[a]";

import type { ClauseAlignmentWindow } from "@/service/voice/elevenlabs";

export type VoiceSwapAlignOptions = {
  trimStart?: number;
  trimEnd?: number;
  delayMs?: number;
  tempo?: number;
  durationSeconds?: number;
  clauses?: ClauseAlignmentWindow[];
};

function fmtNum(value: number) {
  return value.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}

export function clauseAlignedVoiceFilter(
  clauses: ClauseAlignmentWindow[],
  durationSeconds = 5,
): string {
  if (clauses.length === 0) return VOICE_SWAP_FILTER;
  const splitLabels = clauses.map((_, idx) => `[s${idx}]`).join("");
  const branches: string[] = [
    clauses.length === 1
      ? "[1:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo[s0]"
      : `[1:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo,asplit=${clauses.length}${splitLabels}`,
  ];
  const concatInputs: string[] = [];
  let segCount = 0;
  let cursor = 0;

  clauses.forEach((c, idx) => {
    const gap = c.targetStart - cursor;
    if (gap >= 0.01) {
      branches.push(`aevalsrc=0:c=stereo:s=44100:d=${fmtNum(gap)}[g${idx}]`);
      concatInputs.push(`[g${idx}]`);
      segCount += 1;
    }
    const ttsSpan = Math.max(0.08, c.ttsEnd - c.ttsStart);
    const targetSpan = Math.max(0.08, c.targetEnd - c.targetStart);
    const tempo = Math.min(1.5, Math.max(0.7, ttsSpan / targetSpan));
    const parts = [
      `[s${idx}]atrim=start=${fmtNum(c.ttsStart)}:end=${fmtNum(c.ttsEnd)}`,
      "asetpts=N/SR/TB",
      ...(Math.abs(tempo - 1) > 0.01 ? [`atempo=${fmtNum(tempo)}`] : []),
      `asetpts=N/SR/TB[c${idx}]`,
    ];
    branches.push(parts.join(","));
    concatInputs.push(`[c${idx}]`);
    segCount += 1;
    cursor = c.targetEnd;
  });

  const endTrim = durationSeconds > 0 ? `,atrim=0:${fmtNum(durationSeconds)}` : "";
  branches.push(
    `${concatInputs.join("")}concat=n=${segCount}:v=0:a=1,apad${endTrim},asetpts=N/SR/TB[a]`,
  );
  return branches.join(";");
}

export function alignedVoiceSwapFilter(options?: VoiceSwapAlignOptions): string {
  if (options?.clauses && options.clauses.length > 0) {
    return clauseAlignedVoiceFilter(options.clauses, options.durationSeconds);
  }
  const hasTrim =
    (options?.trimStart !== undefined && options.trimStart > 0) ||
    (options?.trimEnd !== undefined && options.trimEnd > 0);
  const hasTempo =
    options?.tempo !== undefined && Math.abs(options.tempo - 1) > 0.005;
  const hasDelay = options?.delayMs !== undefined && options.delayMs > 0;
  if (!hasTrim && !hasTempo && !hasDelay) {
    return VOICE_SWAP_FILTER;
  }
  const steps = ["[1:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo"];
  if (hasTrim) {
    const startPart =
      options?.trimStart !== undefined ? `start=${fmtNum(options.trimStart)}` : "";
    const endPart =
      options?.trimEnd !== undefined && options.trimEnd > (options?.trimStart ?? 0)
        ? `end=${fmtNum(options.trimEnd)}`
        : "";
    const range = [startPart, endPart].filter(Boolean).join(":");
    if (range) {
      steps.push(`atrim=${range}`, "asetpts=N/SR/TB");
    }
  }
  if (hasTempo && options?.tempo) {
    const clamped = Math.min(1.45, Math.max(0.75, options.tempo));
    steps.push(`atempo=${fmtNum(clamped)}`, "asetpts=N/SR/TB");
  }
  if (hasDelay && options?.delayMs) {
    const sec = fmtNum(options.delayMs / 1000);
    const bodyFilter = `${steps.join(",")}[body]`;
    const endTrim =
      options.durationSeconds && options.durationSeconds > 0
        ? `,atrim=0:${fmtNum(options.durationSeconds)}`
        : "";
    return `aevalsrc=0:c=stereo:s=44100:d=${sec}[pre];${bodyFilter};[pre][body]concat=n=2:v=0:a=1,apad${endTrim},asetpts=N/SR/TB[a]`;
  }
  steps.push("apad,asetpts=N/SR/TB[a]");
  return steps.join(",");
}

// Video is copied untouched; only the audio is rebuilt.
export function mixVoiceArgs(
  clip: string,
  voice: string,
  out: string,
  options?: VoiceSwapAlignOptions,
) {
  const filter = alignedVoiceSwapFilter(options);
  return [
    "-y",
    "-i",
    clip,
    "-i",
    voice,
    "-filter_complex",
    filter,
    "-map",
    "0:v",
    "-map",
    "[a]",
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    ...(options?.durationSeconds && options.durationSeconds > 0
      ? ["-t", options.durationSeconds.toFixed(6)]
      : []),
    "-movflags",
    "+faststart",
    out,
  ];
}
