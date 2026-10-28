import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildTimedLipSyncPromptBlock,
  cleanSpokenDialogueLine,
  convertSpeech,
  createVoiceClone,
  ELEVENLABS_TTS_MODEL,
  elevenLabsVoiceLabels,
  fetchForcedAlignment,
  formatConversationalBreathPauses,
  groupAlignmentTokens,
  matchClauseWindows,
  parseSpeechWindowFromStderr,
  STS_VOICE_SETTINGS,
  synthesizeSpeech,
  synthesizeSpeechWithTimestamps,
  TALKING_HEAD_TTS_VOICE_SETTINGS,
  TTS_WITH_TIMESTAMPS_VOICE_SETTINGS,
  withTimedLipSyncPrompt,
} from "@/service/voice/elevenlabs";
import {
  alignedVoiceSwapFilter,
  clauseAlignedVoiceFilter,
  mixVoiceArgs,
} from "@/service/voice/voice-swap-args";

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
  assert.deepEqual(JSON.parse(String(capturedForm?.get("labels"))), {
    language: "zh",
    accent: "zh-hong-kong-cantonese",
  });
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

test("parseSpeechWindowFromStderr and alignedVoiceSwapFilter trim TTS silence and 1:1 lock to source mouth window", () => {
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

  const filter = alignedVoiceSwapFilter({
    trimStart: 0.08,
    trimEnd: 3.49,
    delayMs: 885,
    tempo: 0.9167,
    durationSeconds: 5.17,
  });
  assert.match(filter, /atrim=start=0\.08:end=3\.49,asetpts=N\/SR\/TB/);
  assert.match(filter, /atempo=0\.9167/);
  assert.match(filter, /aevalsrc=0:c=stereo:s=44100:d=0\.885/);
  assert.match(filter, /concat=n=2:v=0:a=1,apad,atrim=0:5\.17,asetpts=N\/SR\/TB\[a\]$/);

  const args = mixVoiceArgs("in.mp4", "voice.mp3", "out.mp4", {
    trimStart: 0.08,
    trimEnd: 3.49,
    delayMs: 885,
    tempo: 0.9167,
    durationSeconds: 5.17,
  });
  assert.ok(args.includes("-t"));
  assert.equal(args[args.indexOf("-t") + 1], "5.170000");
});

test("synthesizeSpeechWithTimestamps retrieves audio and character timestamps and builds timed lip-sync prompt", async () => {
  const alignment = {
    characters: ["有", "無", "你", "I", "G", "？"],
    character_start_times_seconds: [0.0, 0.16, 0.32, 0.5, 0.65, 0.8],
    character_end_times_seconds: [0.16, 0.32, 0.5, 0.65, 0.8, 0.85],
  };
  let capturedUrl = "";
  let capturedBody: Record<string, unknown> | undefined;
  const fakeFetch: typeof fetch = async (input, init) => {
    capturedUrl = typeof input === "string" ? input : input.toString();
    capturedBody = JSON.parse(String(init?.body));
    return new Response(
      JSON.stringify({
        audio_base64: Buffer.from("mp3-bytes").toString("base64"),
        alignment,
      }),
      { status: 200 },
    );
  };

  const res = await synthesizeSpeechWithTimestamps("AlY88XuxqPLuBzrEimDn", "有無你IG？", {
    apiKey: "test-xi-key",
    fetch: fakeFetch,
  });

  assert.match(capturedUrl, /\/v1\/text-to-speech\/AlY88XuxqPLuBzrEimDn\/with-timestamps\?output_format=mp3_44100_128$/);
  assert.deepEqual(capturedBody?.voice_settings, TTS_WITH_TIMESTAMPS_VOICE_SETTINGS);
  assert.equal(TTS_WITH_TIMESTAMPS_VOICE_SETTINGS.stability, 0.7);
  assert.equal(TTS_WITH_TIMESTAMPS_VOICE_SETTINGS.similarity_boost, 1);
  assert.equal(res.audio.toString(), "mp3-bytes");
  const tokens = groupAlignmentTokens(res.alignment, 0.4);
  assert.deepEqual(tokens, [
    { token: "有", start: 0.4, end: 0.56 },
    { token: "無", start: 0.56, end: 0.72 },
    { token: "你", start: 0.72, end: 0.9 },
    { token: "IG", start: 0.9, end: 1.2 },
  ]);

  const block = buildTimedLipSyncPromptBlock(res.alignment, {
    onsetSeconds: 0.4,
    clipDurationSeconds: 5,
  });
  assert.match(block, /0\.00s–0\.40s: mouth closed/);
  assert.match(block, /0\.40s–0\.56s: "有"/);
  assert.match(block, /0\.90s–1\.20s: "IG"/);
  assert.match(block, /1\.20s–5\.00s: speech finished, mouth closed/);

  const basePrompt = "0–0.2s 坐住準備開口；0.2–4.7s 口型跟住講；4.7–5s 口部合上。";
  const updated = withTimedLipSyncPrompt(basePrompt, res.alignment, {
    onsetSeconds: 0.4,
    clipDurationSeconds: 5,
  });
  assert.match(updated, /0\.40–1\.20s 口型跟住講/);
  assert.match(updated, /1\.20–5s 口部合上/);
  assert.match(updated, /EXACT LIP-SYNC TIMING SCHEDULE/);

  // Continued clips (clip 2+) use "0–4.7s" and long TTS alignments must clamp inside clipDurationSeconds.
  const longAlignment = {
    characters: ["呢", "個", "直", "播", "啦"],
    character_start_times_seconds: [0.0, 1.2, 2.4, 3.6, 4.6],
    character_end_times_seconds: [1.2, 2.4, 3.6, 4.6, 5.1],
  };
  const continuedPrompt = "0–0.4s 保持第一幀嘅構圖；0–4.7s 坐住唔起身口型跟住講；4.7–5s 口部合上。";
  const clamped = withTimedLipSyncPrompt(continuedPrompt, longAlignment, {
    onsetSeconds: 0.4,
    clipDurationSeconds: 5,
  });
  assert.match(clamped, /0\.40–4\.75s 坐住唔起身口型跟住講/);
  assert.match(clamped, /4\.75–5s 口部合上/);
  assert.match(clamped, /4\.75s–5\.00s: speech finished, mouth closed/);
  assert.doesNotMatch(clamped, /5\.\d+–5s/);
});

test("fetchForcedAlignment and matchClauseWindows align Eleven v4 TTS clauses to source video mouth timing", async () => {
  const faWords = [
    { text: "有", start: 0.94, end: 1.04 },
    { text: "無", start: 1.04, end: 1.18 },
    { text: "諗", start: 1.18, end: 1.42 },
    { text: "過", start: 1.42, end: 1.64 },
    { text: "你", start: 1.64, end: 1.76 },
    { text: "個", start: 1.76, end: 1.9 },
    { text: "Instagram", start: 1.9, end: 2.62 },
    { text: "都", start: 2.62, end: 2.76 },
    { text: "可", start: 2.76, end: 2.88 },
    { text: "以", start: 2.88, end: 3.02 },
  ];
  const ttsTokens = [
    { token: "有", start: 0, end: 0.16 },
    { token: "無", start: 0.16, end: 0.32 },
    { token: "諗", start: 0.32, end: 0.56 },
    { token: "過", start: 0.56, end: 0.96 },
    { token: "你", start: 0.96, end: 1.04 },
    { token: "個", start: 1.04, end: 1.2 },
    { token: "Instagram", start: 1.2, end: 1.92 },
    { token: "都", start: 1.92, end: 2.133 },
    { token: "可", start: 2.133, end: 2.267 },
    { token: "以", start: 2.267, end: 2.4 },
  ];

  const fakeFetch: typeof fetch = async () =>
    new Response(JSON.stringify({ words: faWords }), { status: 200 });

  const words = await fetchForcedAlignment(Buffer.from("wav"), "有無諗過你個Instagram都可以", {
    apiKey: "test-key",
    fetch: fakeFetch,
  });
  assert.equal(words.length, 10);

  const clauses = matchClauseWindows(ttsTokens, words);
  assert.equal(clauses.length, 1);
  assert.equal(clauses[0].targetStart, 0.94);
  assert.equal(clauses[0].targetEnd, 3.02);

  const filter = clauseAlignedVoiceFilter(clauses, 5.17);
  assert.match(filter, /atrim=start=/);
  assert.match(filter, /aevalsrc=0:c=stereo:s=44100:d=0\.94/);
  assert.match(filter, /concat=n=/);
  assert.match(filter, /asetpts=N\/SR\/TB\[a\]$/);
});

test("elevenLabsVoiceLabels maps yue, zh, and en to their ElevenLabs language and accent labels", () => {
  assert.deepEqual(elevenLabsVoiceLabels("yue", "female"), {
    language: "zh",
    accent: "zh-hong-kong-cantonese",
    gender: "female",
  });
  assert.deepEqual(elevenLabsVoiceLabels("zh", "male"), {
    language: "zh",
    accent: "mandarin",
    gender: "male",
  });
  assert.deepEqual(elevenLabsVoiceLabels("en"), {
    language: "en",
    accent: "american",
  });
});

test("conversational synthesizeSpeechWithTimestamps uses expressive voice settings and inserts inter-sentence breath pauses", async () => {
  assert.equal(
    formatConversationalBreathPauses("Stop wasting money on ads for your SaaS! If you are running a business, try Scro.io. It saves time!"),
    "Stop wasting money on ads for your SaaS! ... If you are running a business, try Scro.io. ... It saves time!",
  );

  let capturedBody: Record<string, unknown> | undefined;
  const fakeFetch: typeof fetch = async (_input, init) => {
    capturedBody = JSON.parse(String(init?.body));
    return new Response(
      JSON.stringify({
        audio_base64: Buffer.from("mp3-bytes").toString("base64"),
      }),
      { status: 200 },
    );
  };

  await synthesizeSpeechWithTimestamps("voice123", "Hello there! Welcome to Scro.", {
    apiKey: "test-xi-key",
    fetch: fakeFetch,
    conversational: true,
  });

  assert.equal(capturedBody?.text, "Hello there! ... Welcome to Scro.");
  assert.deepEqual(capturedBody?.voice_settings, TALKING_HEAD_TTS_VOICE_SETTINGS);
  assert.equal(TALKING_HEAD_TTS_VOICE_SETTINGS.stability, 0.28);
  assert.equal(TALKING_HEAD_TTS_VOICE_SETTINGS.style, 0.35);
});
