// Mono 44.1k WAV of the clip's soundtrack, sent to the voice changer.
export function extractSpeechArgs(source: string, out: string) {
  return ["-y", "-i", source, "-vn", "-ac", "1", "-ar", "44100", "-c:a", "pcm_s16le", out];
}

// Directly replace the clip's audio with the ElevenLabs voice track.
export const VOICE_SWAP_FILTER =
  "[1:a]aresample=44100,aformat=channel_layouts=stereo[a]";

export function alignedVoiceSwapFilter(options?: {
  delayMs?: number;
  tempo?: number;
}): string {
  if (!options?.delayMs && (!options?.tempo || options.tempo <= 1.001)) {
    return VOICE_SWAP_FILTER;
  }
  const steps = ["[1:a]aresample=44100,aformat=channel_layouts=stereo"];
  if (options.tempo && options.tempo > 1.001) {
    steps.push(`atempo=${Math.min(2, options.tempo).toFixed(4).replace(/0+$/, "").replace(/\.$/, "")}`);
  }
  if (options.delayMs && options.delayMs > 0) {
    const ms = Math.round(options.delayMs);
    steps.push(`adelay=${ms}|${ms}`);
  }
  steps.push("apad[a]");
  return steps.join(",");
}

// Video is copied untouched; only the audio is rebuilt.
export function mixVoiceArgs(
  clip: string,
  voice: string,
  out: string,
  options?: { delayMs?: number; tempo?: number; durationSeconds?: number },
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
