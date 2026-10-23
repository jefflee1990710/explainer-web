import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ffmpegStderr, runFfmpeg } from "@/service/reel/concat";
import {
  cleanSpokenDialogueLine,
  convertSpeech,
  fetchForcedAlignment,
  groupAlignmentTokens,
  matchClauseWindows,
  parseSpeechWindowFromStderr,
  synthesizeSpeech,
  synthesizeSpeechWithTimestamps,
} from "@/service/voice/elevenlabs";
import {
  extractSpeechArgs,
  HEYGEN_WARMUP_PAD_MS,
  HEYGEN_WARMUP_TRIM_SECONDS,
  mixVoiceArgs,
  padAudioLeadingSilenceArgs,
  trimLeadingVideoArgs,
} from "@/service/voice/voice-swap-args";

export async function padVoForHeyGenWarmup(
  audio: Buffer,
  delayMs = HEYGEN_WARMUP_PAD_MS,
): Promise<Buffer> {
  const dir = await mkdtemp(join(tmpdir(), "vo-pad-"));
  try {
    await writeFile(join(dir, "in.mp3"), audio);
    await runFfmpeg(dir, padAudioLeadingSilenceArgs("in.mp3", "out.mp3", delayMs));
    return await readFile(join(dir, "out.mp3"));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export async function trimHeyGenWarmupFrames(
  videoBuffer: Buffer,
  trimSeconds = HEYGEN_WARMUP_TRIM_SECONDS,
): Promise<Buffer> {
  const dir = await mkdtemp(join(tmpdir(), "heygen-trim-"));
  try {
    await writeFile(join(dir, "in.mp4"), videoBuffer);
    await runFfmpeg(dir, trimLeadingVideoArgs("in.mp4", "out.mp4", trimSeconds));
    return await readFile(join(dir, "out.mp4"));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export type SwapClipVoiceOptions = {
  text?: string;
  voUrl?: string;
  onsetSeconds?: number;
  lipSync?: boolean;
};

async function fetchPreGeneratedVo(voUrl?: string): Promise<Buffer | null> {
  if (!voUrl) return null;
  try {
    const response = await fetch(voUrl);
    if (!response.ok) return null;
    return Buffer.from(await response.arrayBuffer());
  } catch {
    return null;
  }
}

// Re-voice a finished clip with the character's cloned voice using Eleven v4 TTS:
// - When `lipSync` is true (talking-head / surprise-interview generated with minimax/hailuo-3
//   start+end frames), align Eleven v4 TTS clauses to the source video's per-word mouth timing
//   via ElevenLabs Forced Alignment, copying the 2K video stream untouched.
// - When `lipSync` is false (all other directors: off-screen narration with mouths closed),
//   mux the ElevenLabs eleven_v4 TTS track directly onto the video stream.
export async function swapClipVoice(
  buffer: Buffer,
  voiceId: string,
  options?: SwapClipVoiceOptions,
): Promise<Buffer> {
  const dir = await mkdtemp(join(tmpdir(), "voice-"));
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
    const clipWindow = parseSpeechWindowFromStderr(probe);
    const spokenText = cleanSpokenDialogueLine(options?.text);

    if (options?.lipSync && spokenText && /Audio:/.test(probe)) {
      await runFfmpeg(dir, extractSpeechArgs("in.mp4", "speech.wav"));
      const speechWav = await readFile(join(dir, "speech.wav"));
      const [{ audio, alignment }, faWords] = await Promise.all([
        synthesizeSpeechWithTimestamps(voiceId, spokenText),
        fetchForcedAlignment(speechWav, spokenText).catch(() => []),
      ]);
      await writeFile(join(dir, "voice.mp3"), audio);
      const ttsTokens = groupAlignmentTokens(alignment, 0);
      const clauses = matchClauseWindows(ttsTokens, faWords);
      if (clauses.length > 0) {
        await runFfmpeg(
          dir,
          mixVoiceArgs("in.mp4", "voice.mp3", "out.mp4", {
            clauses,
            durationSeconds: clipWindow.duration,
          }),
        );
        return await readFile(join(dir, "out.mp4"));
      }
      const ttsStart = ttsTokens[0]?.start ?? 0;
      const ttsEnd = ttsTokens[ttsTokens.length - 1]?.end ?? clipWindow.duration;
      const targetSpan = Math.max(0.5, clipWindow.end - clipWindow.start);
      const ttsSpan = Math.max(0.2, ttsEnd - ttsStart);
      await runFfmpeg(
        dir,
        mixVoiceArgs("in.mp4", "voice.mp3", "out.mp4", {
          trimStart: ttsStart,
          trimEnd: ttsEnd,
          delayMs: Math.round(clipWindow.start * 1000),
          tempo: Math.min(1.45, Math.max(0.75, ttsSpan / targetSpan)),
          durationSeconds: clipWindow.duration,
        }),
      );
      return await readFile(join(dir, "out.mp4"));
    }

    if (!options?.lipSync) {
      const preGenerated = await fetchPreGeneratedVo(options?.voUrl);
      if (preGenerated || spokenText) {
        const voice = preGenerated ?? (await synthesizeSpeech(voiceId, spokenText));
        await writeFile(join(dir, "voice.mp3"), voice);
        const onsetSeconds = options?.onsetSeconds ?? 0;
        const delayMs = Math.round(onsetSeconds * 1000);
        await runFfmpeg(
          dir,
          mixVoiceArgs("in.mp4", "voice.mp3", "out.mp4", {
            delayMs,
            durationSeconds: clipWindow.duration,
          }),
        );
        return await readFile(join(dir, "out.mp4"));
      }
    }

    if (!/Audio:/.test(probe)) return buffer;
    await runFfmpeg(dir, extractSpeechArgs("in.mp4", "speech.wav"));
    const voice = await convertSpeech(voiceId, await readFile(join(dir, "speech.wav")));
    await writeFile(join(dir, "voice.mp3"), voice);
    await runFfmpeg(dir, mixVoiceArgs("in.mp4", "voice.mp3", "out.mp4"));
    return await readFile(join(dir, "out.mp4"));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// Seconds of an uploaded audio file, read from ffmpeg's probe header (with full-decode fallback for WebM/streaming containers).
export async function probeAudioSeconds(buffer: Buffer, ext: string): Promise<number | null> {
  const dir = await mkdtemp(join(tmpdir(), "voice-probe-"));
  try {
    const name = `sample.${ext}`;
    await writeFile(join(dir, name), buffer);
    const stderr = await ffmpegStderr(dir, ["-i", name]);
    if (!/Audio:/.test(stderr)) return null;
    const match = stderr.match(/Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/);
    if (match) {
      return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
    }
    const fullStderr = await ffmpegStderr(dir, ["-i", name, "-f", "null", "-"]);
    const timeMatches = [...fullStderr.matchAll(/time=(\d+):(\d+):(\d+(?:\.\d+)?)/g)];
    const last = timeMatches[timeMatches.length - 1];
    if (!last) return null;
    return Number(last[1]) * 3600 + Number(last[2]) * 60 + Number(last[3]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
