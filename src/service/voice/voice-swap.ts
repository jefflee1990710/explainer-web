import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ffmpegStderr, runFfmpeg } from "@/service/reel/concat";
import { convertSpeech } from "@/service/voice/elevenlabs";
import { extractSpeechArgs, mixVoiceArgs } from "@/service/voice/voice-swap-args";

// Re-voice a finished clip with the character's cloned voice. Silent clips pass through.
export async function swapClipVoice(buffer: Buffer, voiceId: string): Promise<Buffer> {
  const dir = await mkdtemp(join(tmpdir(), "voice-"));
  try {
    await writeFile(join(dir, "in.mp4"), buffer);
    const probe = await ffmpegStderr(dir, ["-i", "in.mp4"]);
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

// Seconds of an uploaded audio file, read from ffmpeg's probe header.
export async function probeAudioSeconds(buffer: Buffer, ext: string): Promise<number | null> {
  const dir = await mkdtemp(join(tmpdir(), "voice-probe-"));
  try {
    const name = `sample.${ext}`;
    await writeFile(join(dir, name), buffer);
    const stderr = await ffmpegStderr(dir, ["-i", name]);
    if (!/Audio:/.test(stderr)) return null;
    const match = stderr.match(/Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/);
    if (!match) return null;
    return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
