const BASE_URL = "https://api.elevenlabs.io/v1";
// Voice changer model that keeps the source timing, so lips stay in sync.
const STS_MODEL = "eleven_multilingual_sts_v2";

function apiKey() {
  const key = process.env.ELEVENLABS_API_KEY;
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

// Instant Voice Clone from one uploaded sample. Returns the new voice id.
export async function createVoiceClone(input: {
  name: string;
  file: Blob;
  filename: string;
}): Promise<string> {
  const form = new FormData();
  form.append("name", input.name.slice(0, 100));
  form.append("files", input.file, input.filename);
  const response = await fetch(`${BASE_URL}/voices/add`, {
    method: "POST",
    headers: { "xi-api-key": apiKey() },
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

// Speech-to-speech. Background is stripped so only the new voice comes back.
export async function convertSpeech(voiceId: string, audio: Buffer): Promise<Buffer> {
  const form = new FormData();
  form.append("audio", new Blob([new Uint8Array(audio)], { type: "audio/wav" }), "speech.wav");
  form.append("model_id", STS_MODEL);
  form.append("remove_background_noise", "true");
  const response = await fetch(
    `${BASE_URL}/speech-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": apiKey() },
      body: form,
      signal: AbortSignal.timeout(120_000),
    },
  );
  if (!response.ok) throw await failure(response, "換聲失敗");
  return Buffer.from(await response.arrayBuffer());
}
