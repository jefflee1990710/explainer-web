import assert from "node:assert/strict";
import { test } from "node:test";
import {
  normalizeVoiceSampleClips,
  voiceSampleUrls,
  voiceSwapVoiceId,
} from "@/model/character-voice-sample";
import { videoCostUsd } from "@/service/credit-costs";
import {
  fitOffscreenVoiceDuration,
  mixVoiceArgs,
  padAudioLeadingSilenceArgs,
  speedNarrationArgs,
  stripVideoAudioArgs,
  trimLeadingVideoArgs,
  videoPadSeconds,
  VOICE_SWAP_FILTER,
  whiteboardSubmitDurationSeconds,
} from "@/service/voice/voice-swap-args";
import {
  FEMALE_NARRATOR_VOICE_ID,
  MALE_NARRATOR_VOICE_ID,
  resolveVoiceSwapId,
  YUE_FEMALE_NARRATOR_VOICE_ID,
  YUE_MALE_NARRATOR_VOICE_ID,
  ZH_FEMALE_NARRATOR_VOICE_ID,
  ZH_MALE_NARRATOR_VOICE_ID,
} from "@/service/voice/voice-swap-target";

test("normalizeVoiceSampleClips and voiceSampleUrls handle single and multi-file samples", () => {
  const legacy = {
    url: "https://example.com/v1.wav",
    durationSeconds: 15,
    elevenVoiceId: "id1",
    uploadedAt: new Date(),
  };
  assert.deepEqual(normalizeVoiceSampleClips(legacy), [
    { url: "https://example.com/v1.wav", durationSeconds: 15 },
  ]);
  assert.deepEqual(voiceSampleUrls(legacy), ["https://example.com/v1.wav"]);

  const multi = {
    ...legacy,
    clips: [
      { url: "https://example.com/v1.wav", durationSeconds: 15, name: "a.wav" },
      { url: "https://example.com/v2.mp3", durationSeconds: 20, name: "b.mp3" },
    ],
  };
  assert.equal(normalizeVoiceSampleClips(multi).length, 2);
  assert.deepEqual(voiceSampleUrls(multi), [
    "https://example.com/v1.wav",
    "https://example.com/v2.mp3",
  ]);
});

test("voice swap runs only for a one-character cast with a demo voice and prefers language-matched sample", () => {
  assert.equal(voiceSwapVoiceId(undefined), null);
  assert.equal(voiceSwapVoiceId([]), null);
  assert.equal(voiceSwapVoiceId([{}]), null);
  assert.equal(voiceSwapVoiceId([{ voiceSample: { elevenVoiceId: "v1" } }]), "v1");
  assert.equal(
    voiceSwapVoiceId(
      [
        {
          voiceSample: { elevenVoiceId: "v_default" },
          voiceSamples: {
            yue: { url: "https://a/yue.wav", elevenVoiceId: "v_yue" },
            zh: { url: "https://a/zh.wav", elevenVoiceId: "v_zh" },
            en: { url: "https://a/en.wav", elevenVoiceId: "v_en" },
          },
        },
      ],
      "zh",
    ),
    "v_zh",
  );
  assert.equal(
    voiceSwapVoiceId([{ voiceSample: { elevenVoiceId: "v1" } }, { voiceSample: { elevenVoiceId: "v2" } }]),
    null,
  );
});

test("All languages convert on ElevenLabs first, and a cloned demo voice wins", () => {
  const yue = { skillSlug: "talking-head-director", language: "yue" };
  assert.equal(resolveVoiceSwapId(yue), YUE_MALE_NARRATOR_VOICE_ID);
  assert.equal(
    resolveVoiceSwapId({ skillSlug: "cartoon-explainer-video-director", language: "yue" }),
    YUE_MALE_NARRATOR_VOICE_ID,
  );
  assert.equal(
    resolveVoiceSwapId({
      skillSlug: "papercraft-diorama-director",
      language: "yue",
      voiceGender: "male",
    }),
    YUE_MALE_NARRATOR_VOICE_ID,
  );
  assert.equal(
    resolveVoiceSwapId({
      skillSlug: "papercraft-diorama-director",
      language: "yue",
      voiceGender: "female",
    }),
    YUE_FEMALE_NARRATOR_VOICE_ID,
  );
  assert.equal(
    resolveVoiceSwapId({ skillSlug: "cartoon-explainer-video-director", language: "en", voiceGender: "female" }),
    FEMALE_NARRATOR_VOICE_ID,
  );
  assert.equal(
    resolveVoiceSwapId({ skillSlug: "cartoon-explainer-video-director", language: "zh", voiceGender: "male" }),
    ZH_MALE_NARRATOR_VOICE_ID,
  );
  assert.equal(
    resolveVoiceSwapId({ skillSlug: "cartoon-explainer-video-director", language: "zh", voiceGender: "female" }),
    ZH_FEMALE_NARRATOR_VOICE_ID,
  );
  assert.equal(
    resolveVoiceSwapId({ ...yue, cast: [{ voiceSample: { elevenVoiceId: "clone" } }] }),
    "clone",
  );
  assert.equal(
    resolveVoiceSwapId({ skillSlug: "dialogue-qa-director", language: "yue" }),
    YUE_MALE_NARRATOR_VOICE_ID,
  );
  assert.equal(resolveVoiceSwapId({ skillSlug: "opening-director", language: "yue" }), YUE_MALE_NARRATOR_VOICE_ID);
  assert.equal(
    resolveVoiceSwapId({
      skillSlug: "talking-head-director",
      language: "zh",
      cast: [{ voiceSample: { elevenVoiceId: "clone" } }],
    }),
    "clone",
  );
  assert.equal(
    resolveVoiceSwapId({
      skillSlug: "cartoon-explainer-video-director",
      language: "en",
      cast: [{ voiceSample: { elevenVoiceId: "clone" } }],
    }),
    "clone",
  );
  assert.equal(
    resolveVoiceSwapId({
      skillSlug: "cartoon-explainer-video-director",
      language: "en",
    }),
    MALE_NARRATOR_VOICE_ID,
  );
  assert.equal(
    resolveVoiceSwapId({
      skillSlug: "dialogue-qa-director",
      language: "yue",
      spokenLine: 'Joyce: "你好。"',
      cast: [
        { name: "Joyce", voice: { gender: "female" } },
        { name: "Scro", voice: { gender: "male" } },
      ],
    }),
    YUE_FEMALE_NARRATOR_VOICE_ID,
  );
  assert.equal(
    resolveVoiceSwapId({
      language: "yue",
      cast: [{ name: "Ada", voice: { gender: "female" } }],
    }),
    YUE_FEMALE_NARRATOR_VOICE_ID,
  );
  assert.equal(
    resolveVoiceSwapId({
      skillSlug: "dialogue-qa-director",
      language: "yue",
      spokenLine: 'Scro: "呢個係答案。"',
      cast: [
        { name: "Joyce", voiceSample: { elevenVoiceId: "v_joyce" } },
        { name: "Scro", voiceSample: { elevenVoiceId: "v_scro" } },
      ],
    }),
    "v_scro",
  );
  assert.equal(videoCostUsd(5, "doodle", Boolean(resolveVoiceSwapId(yue))), 0.975);
});

test("voice is included in the Hailuo 3 × 1.5 billed rate without extra surcharge", () => {
  assert.equal(videoCostUsd(5, undefined, true), 0.975);
  assert.equal(videoCostUsd(8, "realistic", true), 1.56);
  assert.equal(videoCostUsd(3, undefined, true), 0.975);
  assert.equal(videoCostUsd(5), 0.975);
});

test("whiteboard submit duration grows to cover a longer VO and stays put when VO fits", () => {
  assert.equal(whiteboardSubmitDurationSeconds(5, 6.6), 7);
  assert.equal(whiteboardSubmitDurationSeconds(5, 5.41), 6);
  assert.equal(whiteboardSubmitDurationSeconds(5, 5.0), 5);
  assert.equal(whiteboardSubmitDurationSeconds(5, 5.04), 5);
  assert.equal(whiteboardSubmitDurationSeconds(5, 12.8), 12);
  assert.equal(whiteboardSubmitDurationSeconds(8, null), 8);
});

test("off-screen mux grows the clip to VO length only when expand is on and VO overruns", () => {
  assert.equal(
    fitOffscreenVoiceDuration({ videoSeconds: 5.17, voSeconds: 6.6, expandToVo: true }),
    6.6,
  );
  assert.equal(
    fitOffscreenVoiceDuration({ videoSeconds: 5.17, voSeconds: 6.6, expandToVo: false }),
    5.17,
  );
  assert.equal(
    fitOffscreenVoiceDuration({ videoSeconds: 5.17, voSeconds: 5.2, expandToVo: true }),
    5.17,
  );
  assert.equal(videoPadSeconds(5.17, 6.6), 1.43);
  assert.equal(videoPadSeconds(5.17, 5.2), 0);
});

test("mix freezes the last frame when expanding a short whiteboard clip to a longer VO", () => {
  const args = mixVoiceArgs("in.mp4", "voice.mp3", "out.mp4", {
    durationSeconds: 6.6,
    videoSeconds: 5.17,
    expandVideoToVo: true,
  });
  const filter = args[args.indexOf("-filter_complex") + 1];
  assert.match(String(filter), /tpad=stop_mode=clone:stop_duration=1\.43/);
  assert.equal(args[args.indexOf("-c:v") + 1], "libx264");
  assert.equal(args[args.indexOf("-t") + 1], "6.600000");

  const fitting = mixVoiceArgs("in.mp4", "voice.mp3", "out.mp4", {
    durationSeconds: 5.17,
    videoSeconds: 5.17,
    expandVideoToVo: true,
  });
  assert.equal(fitting[fitting.indexOf("-c:v") + 1], "copy");
});

test("mix keeps the video stream and directly uses the ElevenLabs voice track without mixing original audio", () => {
  const args = mixVoiceArgs("in.mp4", "voice.mp3", "out.mp4");
  assert.deepEqual(args.slice(args.indexOf("-map"), args.indexOf("-map") + 4), ["-map", "0:v", "-map", "[a]"]);
  assert.equal(args[args.indexOf("-c:v") + 1], "copy");
  assert.doesNotMatch(VOICE_SWAP_FILTER, /\[0:a\]/);
  assert.doesNotMatch(VOICE_SWAP_FILTER, /sidechaincompress/);
  assert.doesNotMatch(VOICE_SWAP_FILTER, /amix/);
  assert.match(VOICE_SWAP_FILTER, /^\[1:a\]aresample=44100,aformat=channel_layouts=stereo\[a\]$/);
});

test("HeyGen warmup helpers pad leading VO silence and trim leading warmup video frames", () => {
  const padArgs = padAudioLeadingSilenceArgs("in.mp3", "out.mp3", 450);
  assert.ok(padArgs.includes("adelay=450|450"));
  const trimArgs = trimLeadingVideoArgs("in.mp4", "out.mp4", 0.4);
  assert.equal(trimArgs[trimArgs.indexOf("-ss") + 1], "0.40");
});

test("stripVideoAudioArgs copies the video stream and removes any audio track", () => {
  const args = stripVideoAudioArgs("bridge.mp4", "silent.mp4");
  assert.equal(args[args.indexOf("-c:v") + 1], "copy");
  assert.ok(args.includes("-an"));
});

test("explainer narration tempo uses atempo 1.25", () => {
  const args = speedNarrationArgs("in.mp3", "out.mp3", 1.25);
  assert.equal(args[args.indexOf("-af") + 1], "atempo=1.25");
  assert.equal(args[args.indexOf("-c:a") + 1], "libmp3lame");
});
