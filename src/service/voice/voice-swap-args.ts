// Mono 44.1k WAV of the clip's soundtrack, sent to the voice changer.
export function extractSpeechArgs(source: string, out: string) {
  return ["-y", "-i", source, "-vn", "-ac", "1", "-ar", "44100", "-c:a", "pcm_s16le", out];
}

// Directly replace the clip's audio with the ElevenLabs converted voice track.
export const VOICE_SWAP_FILTER =
  "[1:a]aresample=44100,aformat=channel_layouts=stereo[a]";

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
