import assert from "node:assert/strict";
import { test } from "node:test";
import {
  generateElevenLabsSoundBytes,
  SOUND_EFFECT_CATEGORIES,
} from "@/service/sound-effect/elevenlabs-sfx";

test("generateElevenLabsSoundBytes calls ElevenLabs /v1/sound-generation with text and duration", async () => {
  let capturedUrl = "";
  let capturedBody: Record<string, unknown> | undefined;
  const fakeFetch: typeof fetch = async (input, init) => {
    capturedUrl = typeof input === "string" ? input : input.toString();
    capturedBody = JSON.parse(String(init?.body));
    return new Response(new Uint8Array([10, 20, 30, 40]), { status: 200 });
  };

  const out = await generateElevenLabsSoundBytes(
    { text: "cinematic whoosh transition", durationSeconds: 2.5 },
    { apiKey: "test-key", fetch: fakeFetch },
  );

  assert.equal(out.length, 4);
  assert.match(capturedUrl, /\/v1\/sound-generation$/);
  assert.equal(capturedBody?.text, "cinematic whoosh transition");
  assert.equal(capturedBody?.duration_seconds, 2.5);
  assert.ok(SOUND_EFFECT_CATEGORIES.some((c) => c.id === "whoosh"));
});
