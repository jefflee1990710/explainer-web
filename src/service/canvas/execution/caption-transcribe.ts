// Server transcription for the auto-captions node. Cantonese SRT is rewritten
// into Hong Kong Traditional before it is stored.

import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { persistBuffer } from "@/service/higgsfield/persist";
import { ffmpegStderr, runFfmpeg } from "@/service/reel/concat";
import { isElevenLabsConfigured } from "@/service/voice/elevenlabs";
import { applyCaptionScript } from "@/service/canvas/execution/caption-traditional";
import {
  SCRIBE_MODEL_ID,
  cuesFromScribeWords,
  cuesToSrt,
  durationFromProbe,
  probeHasAudio,
  type CaptionLanguage,
  type ScribeWord,
} from "@/service/canvas/execution/captions";

// Reads a remote or local media duration without downloading the whole file.
export async function probeRemoteDurationSec(url: string): Promise<number | null> {
  const stderr = await ffmpegStderr(process.cwd(), ["-i", url]).catch(() => "");
  return durationFromProbe(stderr);
}

async function scribeAudio(
  audio: Buffer,
  language: CaptionLanguage,
): Promise<{ words: ScribeWord[]; text: string }> {
  if (!isElevenLabsConfigured()) throw new Error("尚未設定 ELEVENLABS_API_KEY");
  const body = new FormData();
  body.set("model_id", SCRIBE_MODEL_ID);
  body.set("tag_audio_events", "false");
  body.set("diarize", "false");
  if (language !== "auto") body.set("language_code", language);
  body.set("file", new Blob([new Uint8Array(audio)], { type: "audio/mpeg" }), "speech.mp3");
  const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY ?? "" },
    body,
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 180);
    throw new Error(`語音轉字幕失敗（HTTP ${response.status}）${detail ? ` ${detail}` : ""}`);
  }
  const json = (await response.json()) as { text?: string; words?: ScribeWord[] };
  return { words: Array.isArray(json.words) ? json.words : [], text: json.text ?? "" };
}

export type TranscribeCaptionDeps = {
  downloadToFile: (url: string, dest: string) => Promise<void>;
  persistSrt: (buffer: Buffer, pathname: string) => Promise<string>;
};

// Extracts the video's audio, transcribes it, and stores the SRT on Blob.
export async function transcribeCaptionVideo(
  input: { videoUrl: string; language: CaptionLanguage; pathname: string },
  deps?: Partial<TranscribeCaptionDeps>,
): Promise<{ srt: string; outputUrl: string; durationSec: number }> {
  const resolved: TranscribeCaptionDeps = {
    downloadToFile: async (url, dest) => {
      const response = await fetch(url, { signal: AbortSignal.timeout(120_000) });
      if (!response.ok) throw new Error(`無法下載影片（HTTP ${response.status}）`);
      await writeFile(dest, Buffer.from(await response.arrayBuffer()));
    },
    persistSrt: (buffer, pathname) => persistBuffer(buffer, pathname, "text/plain"),
    ...deps,
  };

  const dir = await mkdtemp(join(tmpdir(), "canvas-captions-"));
  try {
    await resolved.downloadToFile(input.videoUrl, join(dir, "in.mp4"));
    const probed = await ffmpegStderr(dir, ["-i", "in.mp4"]);
    if (!probeHasAudio(probed)) throw new Error("來源影片沒有音訊，無法偵測字幕");
    await runFfmpeg(dir, ["-y", "-i", "in.mp4", "-vn", "-acodec", "libmp3lame", "-b:a", "128k", "speech.mp3"]);
    const durationSec = durationFromProbe(await ffmpegStderr(dir, ["-i", "speech.mp3"])) ?? durationFromProbe(probed) ?? 1;
    const audio = await readFile(join(dir, "speech.mp3"));
    const spoken = await scribeAudio(audio, input.language);
    const cues = cuesFromScribeWords(spoken.words).map((cue) => ({
      ...cue,
      text: applyCaptionScript(cue.text, input.language),
    }));
    const srt =
      cues.length > 0
        ? cuesToSrt(cues)
        : spoken.text.trim()
          ? cuesToSrt([{ start: 0, end: durationSec, text: applyCaptionScript(spoken.text.trim(), input.language) }])
          : "";
    if (!srt.trim()) throw new Error("沒有偵測到語音");
    const outputUrl = await resolved.persistSrt(Buffer.from(srt, "utf8"), input.pathname);
    return { srt, outputUrl, durationSec };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
