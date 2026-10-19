import assert from "node:assert/strict";
import { test } from "node:test";
import { convertSpeech, STS_VOICE_SETTINGS } from "@/service/voice/elevenlabs";

test("convertSpeech sends high-stability voice_settings so Cantonese tones and prosody stay locked to source speech", async () => {
  let capturedForm: FormData | undefined;
  const fakeFetch: typeof fetch = async (_input, init) => {
    capturedForm = init?.body as FormData;
    return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
  };

  const out = await convertSpeech("AlY88XuxqPLuBzrEimDn", Buffer.from("wav"), {
    apiKey: "test-xi-key",
    fetch: fakeFetch,
  });

  assert.equal(out.length, 3);
  assert.equal(capturedForm?.get("model_id"), "eleven_multilingual_sts_v2");
  assert.equal(capturedForm?.get("remove_background_noise"), "true");
  assert.deepEqual(
    JSON.parse(String(capturedForm?.get("voice_settings"))),
    STS_VOICE_SETTINGS,
  );
  assert.equal(STS_VOICE_SETTINGS.stability, 1);
  assert.equal(STS_VOICE_SETTINGS.similarity_boost, 1);
});
