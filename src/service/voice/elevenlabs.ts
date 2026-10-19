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

export type VoiceCloneFileInput = {
  file: Blob;
  filename: string;
};

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

// Text-to-speech using Eleven v4 with 100% stability and similarity.
export async function synthesizeSpeech(
  voiceId: string,
  text: string,
  options?: FetchOptions & { modelId?: string },
): Promise<Buffer> {
  const fetchFn = options?.fetch ?? fetch;
  const cleaned = cleanSpokenDialogueLine(text);
  if (!cleaned) throw new Error("語音合成缺少台詞文字");
  const response = await fetchFn(
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
