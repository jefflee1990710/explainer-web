// Mono 44.1k WAV of the clip's soundtrack, sent to the voice changer.
export function extractSpeechArgs(source: string, out: string) {
  return ["-y", "-i", source, "-vn", "-ac", "1", "-ar", "44100", "-c:a", "pcm_s16le", out];
}

// The original track is ducked hard while the new voice speaks, so the old voice
// is masked and ambience / effects only come through in the gaps.
export const VOICE_SWAP_FILTER = [
  "[1:a]aresample=44100,aformat=channel_layouts=stereo,asplit=2[voice][key]",
  "[0:a]aresample=44100,aformat=channel_layouts=stereo[bed]",
  "[bed][key]sidechaincompress=threshold=0.015:ratio=20:attack=5:release=300[ducked]",
  "[ducked]volume=0.5[bg]",
  "[bg][voice]amix=inputs=2:duration=first:normalize=0[a]",
].join(";");

// Video is copied untouched; only the audio is rebuilt.
export function mixVoiceArgs(clip: string, voice: string, out: string) {
  return [
    "-y",
    "-i",
    clip,
    "-i",
    voice,
    "-filter_complex",
    VOICE_SWAP_FILTER,
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
    "-movflags",
    "+faststart",
    out,
  ];
}
