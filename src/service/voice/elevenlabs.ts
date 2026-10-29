const BASE_URL = "https://api.elevenlabs.io/v1";
// Voice changer model that keeps the source timing, so lips stay in sync.
const STS_MODEL = "eleven_multilingual_sts_v2";
export const ELEVENLABS_TTS_MODEL = "eleven_v4";

// Lock stability and similarity to 1.0 (100%) so ElevenLabs STS
// preserves Cantonese 9-tone contours and cloned voice fidelity verbatim.
export const STS_VOICE_SETTINGS = {
  stability: 1,
  similarity_boost: 1,
  style: 0,
  use_speaker_boost: true,
} as const;

// Pre-video TTS (`with-timestamps`) uses 0.70 stability so spoken lines keep
// natural conversational prosody and breathing rhythm for lip-sync models
// while 1.0 similarity_boost locks the cloned voice timbre and Cantonese tones.
export const TTS_WITH_TIMESTAMPS_VOICE_SETTINGS = {
  stability: 0.7,
  similarity_boost: 1,
  style: 0,
  use_speaker_boost: true,
} as const;

// Default talking-head creator TTS settings (English and non-Cantonese languages):
// lower stability (0.28) and higher expressive style (0.55) for conversational pitch/energy swings.
export const TALKING_HEAD_TTS_VOICE_SETTINGS = {
  stability: 0.28,
  similarity_boost: 0.95,
  style: 0.55,
  use_speaker_boost: true,
} as const;

// Per-language overrides for talking-head TTS. Cantonese (yue) is a 9-tone language where
// low stability causes tone drift and foreign-sounding accent bleed, so it uses higher stability (0.70),
// 1.0 similarity_boost, and 0 style; all other languages fall back to TALKING_HEAD_TTS_VOICE_SETTINGS.
export const TALKING_HEAD_TTS_VOICE_SETTINGS_BY_LANGUAGE: Partial<
  Record<
    VoiceSampleLanguage,
    {
      readonly stability: number;
      readonly similarity_boost: number;
      readonly style: number;
      readonly use_speaker_boost: boolean;
    }
  >
> = {
  yue: {
    stability: 0.7,
    similarity_boost: 1,
    style: 0,
    use_speaker_boost: true,
  },
} as const;

export function talkingHeadTtsVoiceSettings(language?: VoiceSampleLanguage | string) {
  if (language && language in TALKING_HEAD_TTS_VOICE_SETTINGS_BY_LANGUAGE) {
    return TALKING_HEAD_TTS_VOICE_SETTINGS_BY_LANGUAGE[language as VoiceSampleLanguage]!;
  }
  return TALKING_HEAD_TTS_VOICE_SETTINGS;
}

// ElevenLabs `eleven_v4` G2P occasionally leaks the Mandarin alveolar nasal `diǎn` for
// colloquial Cantonese `點` (`dim2` with bilabial `-m` closure) in phrases like `點樣` / `點解` / `點算`,
// or reads written `有無` as `mou4` instead of colloquial `有冇` (`mou5`).
// Rewriting `點` to its exact Cantonese Tone-2 `dim2` homophone `踮` (and `有無` -> `有冇`) for the TTS
// request body forces a crisp Cantonese `dim2` (`-m` bilabial closure + high-rising Tone 2) while
// keeping the original script text intact for subtitles and UI.
export function normalizeCantoneseTtsPhonetics(text: string): string {
  return text
    .replace(/有無/gu, "有冇")
    .replace(/點(?=[樣解算做講睇知算好搞得])/gu, "踮")
    .replace(/(?<=[有幾快慢早遲差少多])點(?![A-Za-z0-9])/gu, "踮");
}

export function elevenLabsLanguageCode(
  language?: VoiceSampleLanguage | string,
): string | undefined {
  if (!language) return undefined;
  if (language === "yue") return "yue";
  if (language === "zh") return "zh";
  return language;
}

// Inserts natural human breathing pauses (`... `) at sentence boundaries when a
// talking-head script contains multiple sentences, so the avatar briefly closes its
// mouth, blinks, and takes a breath between sentences instead of reading nonstop.
export function formatConversationalBreathPauses(text: string): string {
  const cleaned = cleanSpokenDialogueLine(text);
  if (!cleaned) return "";
  return cleaned
    .replace(/([A-Za-z0-9'")\]])([.!?])\s+(?=[A-Z0-9"'])/g, "$1$2 ... ")
    .replace(/([。！？!?])\s*(?=[^\s。！？!?])/gu, "$1 ... ")
    .replace(/(?:\s*\.\.\.\s*){2,}/g, " ... ")
    .trim();
}

type FetchOptions = {
  apiKey?: string;
  fetch?: typeof fetch;
};

import type { VoiceSampleLanguage } from "@/model/character-voice-sample";

export type VoiceCloneFileInput = {
  file: Blob;
  filename: string;
};

const ELEVENLABS_LANGUAGE_LABELS: Record<
  VoiceSampleLanguage,
  { language: string; accent: string }
> = {
  yue: { language: "zh", accent: "zh-hong-kong-cantonese" },
  zh: { language: "zh", accent: "mandarin" },
  en: { language: "en", accent: "american" },
  ja: { language: "ja", accent: "japanese" },
  ko: { language: "ko", accent: "korean" },
  id: { language: "id", accent: "indonesian" },
  es: { language: "es", accent: "latin-american" },
  pt: { language: "pt", accent: "brazilian" },
  fr: { language: "fr", accent: "parisian" },
  de: { language: "de", accent: "standard" },
  ru: { language: "ru", accent: "standard" },
  vi: { language: "vi", accent: "vietnamese" },
  th: { language: "th", accent: "thai" },
  ms: { language: "ms", accent: "malay" },
  fil: { language: "fil", accent: "filipino" },
  hi: { language: "hi", accent: "indian" },
  ar: { language: "ar", accent: "modern-standard" },
  it: { language: "it", accent: "standard" },
  nl: { language: "nl", accent: "dutch" },
  pl: { language: "pl", accent: "polish" },
  tr: { language: "tr", accent: "turkish" },
};

export function elevenLabsVoiceLabels(
  language: VoiceSampleLanguage = "yue",
  gender?: "male" | "female",
): Record<string, string> {
  const entry = ELEVENLABS_LANGUAGE_LABELS[language] ?? ELEVENLABS_LANGUAGE_LABELS.yue;
  const base: Record<string, string> = { ...entry };
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
  const timeMatches = [...stderr.matchAll(/time=(\d+):(\d+):(\d+(?:\.\d+)?)/g)];
  const lastTime = timeMatches[timeMatches.length - 1];
  const streamEnd = lastTime
    ? Number(lastTime[1]) * 3600 + Number(lastTime[2]) * 60 + Number(lastTime[3])
    : duration;

  let speechStart = 0;
  for (let i = 0; i < Math.min(starts.length, ends.length); i++) {
    if (starts[i] <= speechStart + 0.05 && ends[i] < duration * 0.45) {
      speechStart = ends[i];
    } else {
      break;
    }
  }

  const audioTrackEnd =
    streamEnd > speechStart + 0.5 && streamEnd < duration ? streamEnd : duration;
  const eofFlushedSilence = /\[out#0\/[^\]]*\][\s\S]*silence_end:\s*[0-9.]+/.test(stderr);
  let speechEnd = audioTrackEnd;
  if (starts.length > 0) {
    const lastStart = starts[starts.length - 1];
    const lastEnd = ends[ends.length - 1] ?? audioTrackEnd;
    if ((eofFlushedSilence || lastEnd >= audioTrackEnd - 0.08) && lastStart > speechStart + 0.5) {
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

function fitTokensToClipDuration(
  tokens: TimedLipSyncToken[],
  onsetSeconds: number,
  clipDurationSeconds: number,
): TimedLipSyncToken[] {
  if (tokens.length === 0) return [];
  const rawEnd = tokens[tokens.length - 1].end;
  const maxSpeechEnd = Math.max(onsetSeconds + 0.5, Number((clipDurationSeconds - 0.25).toFixed(2)));
  if (rawEnd <= maxSpeechEnd) return tokens;
  const rawSpan = Math.max(0.1, rawEnd - onsetSeconds);
  const targetSpan = maxSpeechEnd - onsetSeconds;
  const scale = targetSpan / rawSpan;
  return tokens.map((item) => ({
    token: item.token,
    start: Number((onsetSeconds + (item.start - onsetSeconds) * scale).toFixed(3)),
    end: Number((onsetSeconds + (item.end - onsetSeconds) * scale).toFixed(3)),
  }));
}

export function buildTimedLipSyncPromptBlock(
  alignment?: ElevenLabsAlignment | null,
  options?: { onsetSeconds?: number; clipDurationSeconds?: number },
): string {
  const onset = options?.onsetSeconds ?? DEFAULT_SPEECH_ONSET_SECONDS;
  const clipDur = options?.clipDurationSeconds ?? 5;
  const tokens = fitTokensToClipDuration(
    groupAlignmentTokens(alignment, onset),
    onset,
    clipDur,
  );
  if (tokens.length === 0) return "";
  const speechEnd = tokens[tokens.length - 1].end;
  const lines = [
    `EXACT LIP-SYNC TIMING SCHEDULE (the on-screen speaker's mouth MUST actively open and close to articulate each syllable/word at these exact timestamps — never freeze in a static smile or closed mouth during speech; use natural ~30–40% conversational mouth opening with clean lip closure on bilabial m/b/p consonants, never exaggerated wide-open mouth or excessive jaw swing — and close into a natural smile after ${speechEnd.toFixed(2)}s):`,
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
  const clipDur = options?.clipDurationSeconds ?? 5;
  const tokens = fitTokensToClipDuration(
    groupAlignmentTokens(alignment, onset),
    onset,
    clipDur,
  );
  if (tokens.length === 0) return prompt;
  const speechEnd = tokens[tokens.length - 1].end;
  const onsetStr = onset.toFixed(2);
  const endStr = speechEnd.toFixed(2);

  let updated = prompt
    .replace(/0(?:\.[24])?[–-]4\.[27]s/g, `${onsetStr}–${endStr}s`)
    .replace(/4\.[27][–-](\d+(?:\.\d+)?)s/g, `${endStr}–$1s`);

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

// Text-to-speech with character-level timestamps using Eleven v4.
// When `conversational: true` (talking-head), resolves per-language settings via
// `talkingHeadTtsVoiceSettings(options.language)` (Cantonese `yue` uses stability 0.70 / similarity 1.0 / style 0;
// English and other languages use stability 0.28 / similarity 0.95 / style 0.55) and inserts inter-sentence breath pauses.
export async function synthesizeSpeechWithTimestamps(
  voiceId: string,
  text: string,
  options?: FetchOptions & {
    modelId?: string;
    conversational?: boolean;
    language?: VoiceSampleLanguage | string;
  },
): Promise<{ audio: Buffer; alignment?: ElevenLabsAlignment }> {
  const fetchFn = options?.fetch ?? fetch;
  const rawCleaned = options?.conversational
    ? formatConversationalBreathPauses(text)
    : cleanSpokenDialogueLine(text);
  const cleaned =
    options?.language === "yue"
      ? normalizeCantoneseTtsPhonetics(rawCleaned)
      : rawCleaned;
  if (!cleaned) throw new Error("語音合成缺少台詞文字");
  const voiceSettings = options?.conversational
    ? talkingHeadTtsVoiceSettings(options.language)
    : TTS_WITH_TIMESTAMPS_VOICE_SETTINGS;
  const languageCode = elevenLabsLanguageCode(options?.language);
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
        ...(languageCode ? { language_code: languageCode } : {}),
        voice_settings: voiceSettings,
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

// Normalize word bounds when Forced Alignment collapses a pre-pause or final syllable to 0ms,
// or when character timestamps without punctuation glue trailing silence onto one CJK character.
function normalizeAlignmentBounds<T extends { start: number; end: number }>(
  items: T[],
  getText: (item: T) => string,
): T[] {
  return items.map((item, idx) => {
    const next = items[idx + 1];
    const span = item.end - item.start;
    if (span < 0.08) {
      if (next && next.start - item.start >= 0.12) {
        const restored = Math.min(0.22, (next.start - item.start) * 0.45);
        return { ...item, end: Number((item.start + restored).toFixed(3)) };
      }
      if (!next && items.length > 1) {
        return { ...item, end: Number((item.start + 0.24).toFixed(3)) };
      }
    }
    const text = getText(item);
    if (
      text.length === 1 &&
      /[\u4e00-\u9fff\u3400-\u4dbf]/.test(text) &&
      span >= 0.36 &&
      next &&
      next.start - item.end < 0.04
    ) {
      return { ...item, end: Number((item.start + 0.22).toFixed(3)) };
    }
    return item;
  });
}

// Group matched TTS tokens and source forced-alignment words into continuous clauses,
// breaking at genuine sentence pauses (>= 120ms in both tracks) and seamless abutting
// subphrase checkpoints when cumulative drift exceeds 90ms or after embedded English words.
export function matchClauseWindows(
  rawTtsTokens: TimedLipSyncToken[],
  rawFaWords: ForcedAlignmentWord[],
): ClauseAlignmentWindow[] {
  const ttsTokens = normalizeAlignmentBounds(rawTtsTokens, (item) => item.token);
  const faWords = normalizeAlignmentBounds(rawFaWords, (item) => item.text);
  const count = Math.min(ttsTokens.length, faWords.length);
  if (count === 0) return [];
  const clauses: ClauseAlignmentWindow[] = [];
  let startIdx = 0;

  const hasPauseAfter = (idx: number) => {
    if (idx >= count - 1) return false;
    const nextFaGap = faWords[idx + 1].start - faWords[idx].end;
    const nextTtsGap = ttsTokens[idx + 1].start - ttsTokens[idx].end;
    return nextFaGap >= 0.12 && nextTtsGap >= 0.08;
  };

  for (let i = 0; i < count; i++) {
    const isLast = i === count - 1;
    const hasNaturalPause = hasPauseAfter(i);
    const spanLen = i - startIdx + 1;
    const remLen = count - (i + 1);

    let shouldSeamlessSplit = false;
    if (
      !isLast &&
      !hasNaturalPause &&
      !hasPauseAfter(i + 1) &&
      !hasPauseAfter(i + 2) &&
      spanLen >= 5 &&
      remLen >= 5
    ) {
      const nextFaGap = faWords[i + 1].start - faWords[i].end;
      const nextTtsGap = ttsTokens[i + 1].start - ttsTokens[i].end;
      if (nextFaGap < 0.02 && nextTtsGap < 0.02) {
        let clauseEndIdx = count - 1;
        for (let k = i + 1; k < count - 1; k++) {
          if (hasPauseAfter(k)) {
            clauseEndIdx = k;
            break;
          }
        }
        const cTtsStart = ttsTokens[startIdx].start;
        const cFaStart = faWords[startIdx].start;
        const cTtsSpan = Math.max(0.1, ttsTokens[clauseEndIdx].end - cTtsStart);
        const cFaSpan = Math.max(0.1, faWords[clauseEndIdx].end - cFaStart);
        const linearTarget =
          cFaStart + (ttsTokens[i + 1].start - cTtsStart) * (cFaSpan / cTtsSpan);
        const drift = Math.abs(linearTarget - faWords[i + 1].start);
        const isAsciiWord = /^[A-Za-z0-9]+$/.test(ttsTokens[i].token);
        if (drift >= 0.09 || (isAsciiWord && drift >= 0.04)) {
          shouldSeamlessSplit = true;
        }
      }
    }

    const shouldBreak =
      isLast || (hasNaturalPause && spanLen >= 3 && remLen >= 3) || shouldSeamlessSplit;

    if (shouldBreak) {
      const ttsStart = ttsTokens[startIdx].start;
      const ttsEnd = shouldSeamlessSplit ? ttsTokens[i + 1].start : ttsTokens[i].end;
      const targetStart = faWords[startIdx].start;
      const targetEnd = shouldSeamlessSplit ? faWords[i + 1].start : faWords[i].end;
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
  options?: FetchOptions & { modelId?: string; language?: VoiceSampleLanguage | string },
): Promise<Buffer> {
  const fetchFn = options?.fetch ?? fetch;
  const rawCleaned = cleanSpokenDialogueLine(text);
  const cleaned =
    options?.language === "yue"
      ? normalizeCantoneseTtsPhonetics(rawCleaned)
      : rawCleaned;
  if (!cleaned) throw new Error("語音合成缺少台詞文字");
  const languageCode = elevenLabsLanguageCode(options?.language);
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
        ...(languageCode ? { language_code: languageCode } : {}),
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
