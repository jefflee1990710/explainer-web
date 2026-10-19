import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cleanSpokenDialogueLine,
  convertSpeech,
  createVoiceClone,
  ELEVENLABS_TTS_MODEL,
  parseSpeechWindowFromStderr,
  STS_VOICE_SETTINGS,
  synthesizeSpeech,
} from "@/service/voice/elevenlabs";
import { alignedVoiceSwapFilter, mixVoiceArgs } from "@/service/voice/voice-swap-args";

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

test("synthesizeSpeech calls ElevenLabs text-to-speech with eleven_v4 and 100% stability and similarity", async () => {
  let capturedUrl = "";
  let capturedBody: Record<string, unknown> | undefined;
  const fakeFetch: typeof fetch = async (input, init) => {
    capturedUrl = typeof input === "string" ? input : input.toString();
    capturedBody = JSON.parse(String(init?.body));
    return new Response(new Uint8Array([4, 5, 6, 7]), { status: 200 });
  };

  const out = await synthesizeSpeech(
    "AlY88XuxqPLuBzrEimDn",
    'Alice: "有無諗過你個Instagram都可以變成你嘅生財工具？"',
    {
      apiKey: "test-xi-key",
      fetch: fakeFetch,
    },
  );

  assert.equal(out.length, 4);
  assert.match(
    capturedUrl,
    /\/v1\/text-to-speech\/AlY88XuxqPLuBzrEimDn\?output_format=mp3_44100_128$/,
  );
  assert.equal(ELEVENLABS_TTS_MODEL, "eleven_v4");
  assert.equal(capturedBody?.model_id, "eleven_v4");
  assert.equal(capturedBody?.text, "有無諗過你個Instagram都可以變成你嘅生財工具？");
  assert.deepEqual(capturedBody?.voice_settings, STS_VOICE_SETTINGS);
});

test("createVoiceClone appends multiple audio files to ElevenLabs Instant Voice Clone", async () => {
  let capturedForm: FormData | undefined;
  const fakeFetch: typeof fetch = async (_input, init) => {
    capturedForm = init?.body as FormData;
    return new Response(JSON.stringify({ voice_id: "cloned_multi_id" }), { status: 200 });
  };

  const voiceId = await createVoiceClone(
    {
      name: "Alice",
      files: [
        { file: new Blob(["a"], { type: "audio/wav" }), filename: "sample1.wav" },
        { file: new Blob(["b"], { type: "audio/mp3" }), filename: "sample2.mp3" },
      ],
    },
    { apiKey: "test-xi-key", fetch: fakeFetch },
  );

  assert.equal(voiceId, "cloned_multi_id");
  const uploadedFiles = capturedForm?.getAll("files") ?? [];
  assert.equal(uploadedFiles.length, 2);
});

test("cleanSpokenDialogueLine strips speaker prefix and outer quotes", () => {
  assert.equal(
    cleanSpokenDialogueLine('Alice: "有無諗過你個Instagram都可以變成你嘅生財工具？"'),
    "有無諗過你個Instagram都可以變成你嘅生財工具？",
  );
  assert.equal(
    cleanSpokenDialogueLine("「有無諗過你個Instagram都可以變成你嘅生財工具？」"),
    "有無諗過你個Instagram都可以變成你嘅生財工具？",
  );
});

test("parseSpeechWindowFromStderr and alignedVoiceSwapFilter align TTS to mouth opening", () => {
  const stderr = `
  Duration: 00:00:05.17, start: 0.000000, bitrate: 5559 kb/s
  [silencedetect @ 0x1] silence_start: 0
  [silencedetect @ 0x1] silence_end: 0.306688 | silence_duration: 0.306688
  [silencedetect @ 0x1] silence_start: 0.319063
  [silencedetect @ 0x1] silence_end: 0.885281 | silence_duration: 0.566219
  [silencedetect @ 0x1] silence_start: 4.603562
  [silencedetect @ 0x1] silence_end: 5.184 | silence_duration: 0.580438
  `;
  const win = parseSpeechWindowFromStderr(stderr);
  assert.equal(win.duration, 5.17);
  assert.ok(Math.abs(win.start - 0.885281) < 0.001);
  assert.ok(Math.abs(win.end - 4.603562) < 0.001);

  const filter = alignedVoiceSwapFilter({ delayMs: 885, tempo: 1 });
  assert.match(filter, /adelay=885\|885/);
  assert.doesNotMatch(filter, /atempo/);
  assert.match(filter, /apad/);

  const args = mixVoiceArgs("in.mp4", "voice.mp3", "out.mp4", {
    delayMs: 885,
    durationSeconds: 5.17,
  });
  assert.ok(args.includes("-t"));
  assert.equal(args[args.indexOf("-t") + 1], "5.170000");
});
