const BASE_URL = "https://api.elevenlabs.io/v1";
// Voice changer model that keeps the source timing, so lips stay in sync.
const STS_MODEL = "eleven_multilingual_sts_v2";
export const ELEVENLABS_TTS_MODEL = "eleven_v4";

// Lock stability and similarity to 1.0 (100%) so ElevenLabs TTS and STS
// preserve Cantonese 9-tone contours and cloned voice fidelity verbatim.
export const STS_VOICE_SETTINGS = {
  stability: 1,
  similarity_boost: 1,
  style: 0,
  use_speaker_boost: true,
} as const;

type FetchOptions = {
  apiKey?: string;
  fetch?: typeof fetch;
};

import type { VoiceSampleLanguage } from "@/model/character-voice-sample";

export type VoiceCloneFileInput = {
  file: Blob;
  filename: string;
};

export function elevenLabsVoiceLabels(
  language: VoiceSampleLanguage = "yue",
  gender?: "male" | "female",
): Record<string, string> {
  const base: Record<string, string> =
    language === "en"
      ? { language: "en", accent: "american" }
      : language === "zh"
        ? { language: "zh", accent: "mandarin" }
        : { language: "zh", accent: "zh-hong-kong-cantonese" };
  if (gender) base.gender = gender;
  return base;
}

function apiKey(override?: string) {
  const key = override ?? process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("尚未設定 ELEVENLABS_API_KEY");
  return key;
}

export function isElevenLabsConfigured() {
  return Boolean(process.env.ELEVENLABS_API_KEY);
}

async function failure(response: Response, label: string) {
  const detail = await response.text().catch(() => "");
  return new Error(`${label}（${response.status}）${detail.slice(0, 200)}`);
}

// Strip optional `NAME: "..."` speaker tags and outer quotes from a storyboard VO line.
export function cleanSpokenDialogueLine(line?: string): string {
  let text = (line ?? "").trim();
  if (!text) return "";
  text = text.replace(/^[A-Za-z\u4e00-\u9fa5][\w\u4e00-\u9fa5\s-]{0,24}:\s*/, "").trim();
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("“") && text.endsWith("”")) ||
    (text.startsWith("「") && text.endsWith("」"))
  ) {
    text = text.slice(1, -1).trim();
  }
  return text;
}

export function parseSpeechWindowFromStderr(stderr: string): {
  duration: number;
  start: number;
  end: number;
} {
  const durMatch = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  const duration = durMatch
    ? Number(durMatch[1]) * 3600 + Number(durMatch[2]) * 60 + Number(durMatch[3])
    : 5;

  const starts = [...stderr.matchAll(/silence_start:\s*([0-9.]+)/g)].map((m) => Number(m[1]));
  const ends = [...stderr.matchAll(/silence_end:\s*([0-9.]+)/g)].map((m) => Number(m[1]));

  let speechStart = 0;
  for (let i = 0; i < Math.min(starts.length, ends.length); i++) {
    if (starts[i] <= speechStart + 0.05 && ends[i] < duration * 0.45) {
      speechStart = ends[i];
    } else {
      break;
    }
  }

  let speechEnd = duration;
  if (starts.length > 0) {
    const lastStart = starts[starts.length - 1];
    const lastEnd = ends[ends.length - 1] ?? duration;
    if (lastEnd >= duration - 0.08 && lastStart > speechStart + 0.5) {
      speechEnd = lastStart;
    }
  }

  return { duration, start: speechStart, end: speechEnd };
}

// Instant Voice Clone from one or more uploaded audio samples. Returns the new voice id.
export async function createVoiceClone(
  input: {
    name: string;
    file?: Blob;
    filename?: string;
    files?: VoiceCloneFileInput[];
    language?: VoiceSampleLanguage;
    gender?: "male" | "female";
  },
  options?: FetchOptions,
): Promise<string> {
  const fetchFn = options?.fetch ?? fetch;
  const list: VoiceCloneFileInput[] =
    input.files && input.files.length > 0
      ? input.files
      : input.file
        ? [{ file: input.file, filename: input.filename || "sample.mp3" }]
        : [];
  if (list.length === 0) throw new Error("請選擇聲音檔");

  const form = new FormData();
  form.append("name", input.name.slice(0, 100));
  form.append("remove_background_noise", "true");
  form.append("labels", JSON.stringify(elevenLabsVoiceLabels(input.language, input.gender)));
  for (const item of list) {
    form.append("files", item.file, item.filename);
  }
  const response = await fetchFn(`${BASE_URL}/voices/add`, {
    method: "POST",
    headers: { "xi-api-key": apiKey(options?.apiKey) },
    body: form,
  });
  if (!response.ok) throw await failure(response, "建立聲音複製失敗");
  const body = (await response.json()) as { voice_id?: string };
  if (!body.voice_id) throw new Error("建立聲音複製失敗");
  return body.voice_id;
}

// Best effort: a stale clone only uses a voice slot on the account.
export async function deleteVoiceClone(voiceId: string) {
  try {
    const response = await fetch(`${BASE_URL}/voices/${encodeURIComponent(voiceId)}`, {
      method: "DELETE",
      headers: { "xi-api-key": apiKey() },
    });
    if (!response.ok && response.status !== 404) {
      console.warn("[elevenlabs] delete voice failed", { voiceId, status: response.status });
    }
  } catch (error) {
    console.warn("[elevenlabs] delete voice failed", { voiceId, error });
  }
}

export type ElevenLabsAlignment = {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
};

export type TimedLipSyncToken = {
  token: string;
  start: number;
  end: number;
};

export type ForcedAlignmentWord = {
  text: string;
  start: number;
  end: number;
};

export type ClauseAlignmentWindow = {
  ttsStart: number;
  ttsEnd: number;
  targetStart: number;
  targetEnd: number;
};

export const DEFAULT_SPEECH_ONSET_SECONDS = 0.4;

// Group per-character timestamps into spoken tokens (each Chinese character or contiguous ASCII word).
export function groupAlignmentTokens(
  alignment?: ElevenLabsAlignment | null,
  onsetSeconds = DEFAULT_SPEECH_ONSET_SECONDS,
): TimedLipSyncToken[] {
  if (!alignment?.characters?.length) return [];
  const chars = alignment.characters;
  const starts = alignment.character_start_times_seconds || [];
  const ends = alignment.character_end_times_seconds || [];
  const tokens: TimedLipSyncToken[] = [];

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i] ?? "";
    const rawStart = Number(starts[i] ?? 0);
    const rawEnd = Number(ends[i] ?? rawStart);
    if (!ch.trim() || /^[，。！？、；：「」『』（）()"'.,!?;:\s-]+$/.test(ch)) {
      continue;
    }
    const isAsciiWord = /^[A-Za-z0-9]$/.test(ch);
    const prev = tokens[tokens.length - 1];
    if (isAsciiWord && prev && /^[A-Za-z0-9]+$/.test(prev.token)) {
      prev.token += ch;
      prev.end = Number((onsetSeconds + rawEnd).toFixed(3));
    } else {
      tokens.push({
        token: ch,
        start: Number((onsetSeconds + rawStart).toFixed(3)),
        end: Number((onsetSeconds + rawEnd).toFixed(3)),
      });
    }
  }
  return tokens;
}

export function buildTimedLipSyncPromptBlock(
  alignment?: ElevenLabsAlignment | null,
  options?: { onsetSeconds?: number; clipDurationSeconds?: number },
): string {
  const onset = options?.onsetSeconds ?? DEFAULT_SPEECH_ONSET_SECONDS;
  const clipDur = options?.clipDurationSeconds ?? 5;
  const tokens = groupAlignmentTokens(alignment, onset);
  if (tokens.length === 0) return "";
  const speechEnd = tokens[tokens.length - 1].end;
  const lines = [
    `EXACT LIP-SYNC TIMING SCHEDULE (the on-screen speaker's mouth MUST articulate each syllable/word at these exact timestamps and stay completely closed after ${speechEnd.toFixed(2)}s):`,
    `- 0.00s–${onset.toFixed(2)}s: mouth closed, brief inhale before speaking`,
    ...tokens.map(
      (item) => `- ${item.start.toFixed(2)}s–${item.end.toFixed(2)}s: "${item.token}"`,
    ),
    `- ${speechEnd.toFixed(2)}s–${clipDur.toFixed(2)}s: speech finished, mouth closed in a natural smile (ZERO lip movement after ${speechEnd.toFixed(2)}s).`,
  ];
  return lines.join("\n");
}

export function withTimedLipSyncPrompt(
  prompt: string,
  alignment?: ElevenLabsAlignment | null,
  options?: { onsetSeconds?: number; clipDurationSeconds?: number },
): string {
  const onset = options?.onsetSeconds ?? DEFAULT_SPEECH_ONSET_SECONDS;
  const tokens = groupAlignmentTokens(alignment, onset);
  if (tokens.length === 0) return prompt;
  const speechEnd = tokens[tokens.length - 1].end;
  const onsetStr = onset.toFixed(2);
  const endStr = speechEnd.toFixed(2);

  let updated = prompt
    .replace(/0\.4[–-]4\.2s/g, `${onsetStr}–${endStr}s`)
    .replace(/4\.2[–-](\d+(?:\.\d+)?)s/g, `${endStr}–$1s`);

  const block = buildTimedLipSyncPromptBlock(alignment, options);
  if (block && !updated.includes("EXACT LIP-SYNC TIMING SCHEDULE")) {
    updated = `${updated}\n\n${block}`;
  }
  return updated;
}

async function fetchWithRateLimitRetry(
  fetchFn: typeof fetch,
  url: string,
  init: RequestInit,
  maxRetries = 3,
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetchFn(url, init);
    if (response.status !== 429 || attempt === maxRetries) {
      return response;
    }
    await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
  }
  return fetchFn(url, init);
}

// Text-to-speech with character-level timestamps using Eleven v4 (100% stability & similarity).
export async function synthesizeSpeechWithTimestamps(
  voiceId: string,
  text: string,
  options?: FetchOptions & { modelId?: string },
): Promise<{ audio: Buffer; alignment?: ElevenLabsAlignment }> {
  const fetchFn = options?.fetch ?? fetch;
  const cleaned = cleanSpokenDialogueLine(text);
  if (!cleaned) throw new Error("語音合成缺少台詞文字");
  const response = await fetchWithRateLimitRetry(
    fetchFn,
    `${BASE_URL}/text-to-speech/${encodeURIComponent(voiceId)}/with-timestamps?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey(options?.apiKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: cleaned,
        model_id: options?.modelId || ELEVENLABS_TTS_MODEL,
        voice_settings: STS_VOICE_SETTINGS,
      }),
      signal: AbortSignal.timeout(120_000),
    },
  );
  if (!response.ok) throw await failure(response, "語音合成失敗");
  const body = (await response.json()) as {
    audio_base64?: string;
    alignment?: ElevenLabsAlignment;
    normalized_alignment?: ElevenLabsAlignment;
  };
  if (!body.audio_base64) throw new Error("ElevenLabs 未回傳音訊資料");
  return {
    audio: Buffer.from(body.audio_base64, "base64"),
    alignment: body.alignment ?? body.normalized_alignment,
  };
}

// Forced alignment of source video audio against the transcript to get exact per-word mouth timing.
export async function fetchForcedAlignment(
  audio: Buffer,
  text: string,
  options?: FetchOptions,
): Promise<ForcedAlignmentWord[]> {
  const fetchFn = options?.fetch ?? fetch;
  const cleaned = cleanSpokenDialogueLine(text);
  if (!cleaned) return [];
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(audio)], { type: "audio/wav" }), "speech.wav");
  form.append("text", cleaned);
  const response = await fetchWithRateLimitRetry(
    fetchFn,
    `${BASE_URL}/forced-alignment`,
    {
      method: "POST",
      headers: { "xi-api-key": apiKey(options?.apiKey) },
      body: form,
      signal: AbortSignal.timeout(60_000),
    },
  );
  if (!response.ok) throw await failure(response, "語音對齊失敗");
  const body = (await response.json()) as {
    words?: Array<{ text?: string; start?: number; end?: number }>;
  };
  return (body.words || [])
    .map((item) => ({
      text: (item.text ?? "").trim(),
      start: Number(item.start ?? 0),
      end: Number(item.end ?? item.start ?? 0),
    }))
    .filter(
      (item) =>
        Boolean(item.text) &&
        !/^[，。！？、；：「」『』（）()"'.,!?;:\s-]+$/.test(item.text),
    );
}

// Group matched TTS tokens and source forced-alignment words into continuous clauses,
// breaking ONLY at genuine sentence pauses (>= 120ms in both tracks) so words like
// "生財工具" are never sliced mid-phrase.
export function matchClauseWindows(
  ttsTokens: TimedLipSyncToken[],
  faWords: ForcedAlignmentWord[],
): ClauseAlignmentWindow[] {
  const count = Math.min(ttsTokens.length, faWords.length);
  if (count === 0) return [];
  const clauses: ClauseAlignmentWindow[] = [];
  let startIdx = 0;

  for (let i = 0; i < count; i++) {
    const isLast = i === count - 1;
    const nextFaGap = !isLast ? faWords[i + 1].start - faWords[i].end : 0;
    const nextTtsGap = !isLast ? ttsTokens[i + 1].start - ttsTokens[i].end : 0;
    const hasNaturalPause = nextFaGap >= 0.12 && nextTtsGap >= 0.08;
    const shouldBreak = isLast || (hasNaturalPause && i - startIdx + 1 >= 3 && count - (i + 1) >= 3);

    if (shouldBreak) {
      const ttsStart = ttsTokens[startIdx].start;
      const ttsEnd = ttsTokens[i].end;
      const targetStart = faWords[startIdx].start;
      const targetEnd = faWords[i].end;
      if (ttsEnd > ttsStart && targetEnd > targetStart) {
        clauses.push({ ttsStart, ttsEnd, targetStart, targetEnd });
      }
      startIdx = i + 1;
    }
  }
  return clauses;
}

// Text-to-speech using Eleven v4 with 100% stability and similarity.
export async function synthesizeSpeech(
  voiceId: string,
  text: string,
  options?: FetchOptions & { modelId?: string },
): Promise<Buffer> {
  const fetchFn = options?.fetch ?? fetch;
  const cleaned = cleanSpokenDialogueLine(text);
  if (!cleaned) throw new Error("語音合成缺少台詞文字");
  const response = await fetchWithRateLimitRetry(
    fetchFn,
    `${BASE_URL}/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey(options?.apiKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: cleaned,
        model_id: options?.modelId || ELEVENLABS_TTS_MODEL,
        voice_settings: STS_VOICE_SETTINGS,
      }),
      signal: AbortSignal.timeout(120_000),
    },
  );
  if (!response.ok) throw await failure(response, "語音合成失敗");
  return Buffer.from(await response.arrayBuffer());
}

// Speech-to-speech. Background is stripped so only the new voice comes back.
export async function convertSpeech(
  voiceId: string,
  audio: Buffer,
  options?: FetchOptions,
): Promise<Buffer> {
  const fetchFn = options?.fetch ?? fetch;
  const form = new FormData();
  form.append("audio", new Blob([new Uint8Array(audio)], { type: "audio/wav" }), "speech.wav");
  form.append("model_id", STS_MODEL);
  form.append("remove_background_noise", "true");
  form.append("voice_settings", JSON.stringify(STS_VOICE_SETTINGS));
  const response = await fetchFn(
    `${BASE_URL}/speech-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": apiKey(options?.apiKey) },
      body: form,
      signal: AbortSignal.timeout(120_000),
    },
  );
  if (!response.ok) throw await failure(response, "換聲失敗");
  return Buffer.from(await response.arrayBuffer());
}
