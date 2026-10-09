import assert from "node:assert/strict";
import { test } from "node:test";
import { voiceSwapVoiceId } from "@/model/character-voice-sample";
import { videoCost } from "@/service/credit-costs";
import { mixVoiceArgs, VOICE_SWAP_FILTER } from "@/service/voice/voice-swap-args";
import {
  CANTONESE_VOICE_ID,
  resolveVoiceSwapId,
} from "@/service/voice/voice-swap-target";

test("voice swap runs only for a one-character cast with a demo voice", () => {
  assert.equal(voiceSwapVoiceId(undefined), null);
  assert.equal(voiceSwapVoiceId([]), null);
  assert.equal(voiceSwapVoiceId([{}]), null);
  assert.equal(voiceSwapVoiceId([{ voiceSample: { elevenVoiceId: "v1" } }]), "v1");
  assert.equal(
    voiceSwapVoiceId([{ voiceSample: { elevenVoiceId: "v1" } }, { voiceSample: { elevenVoiceId: "v2" } }]),
    null,
  );
});

test("Cantonese voiceover always converts on ElevenLabs, and a cloned demo voice wins", () => {
  const yue = { skillSlug: "talking-head-director", language: "yue" };
  assert.equal(resolveVoiceSwapId(yue), CANTONESE_VOICE_ID);
  assert.equal(
    resolveVoiceSwapId({ skillSlug: "cartoon-explainer-video-director", language: "yue" }),
    CANTONESE_VOICE_ID,
  );
  assert.equal(
    resolveVoiceSwapId({ ...yue, cast: [{ voiceSample: { elevenVoiceId: "clone" } }] }),
    "clone",
  );
  assert.equal(
    resolveVoiceSwapId({ skillSlug: "dialogue-qa-director", language: "yue" }),
    CANTONESE_VOICE_ID,
  );
  assert.equal(resolveVoiceSwapId({ skillSlug: "opening-director", language: "yue" }), CANTONESE_VOICE_ID);
  assert.equal(
    resolveVoiceSwapId({
      skillSlug: "talking-head-director",
      language: "zh",
      cast: [{ voiceSample: { elevenVoiceId: "clone" } }],
    }),
    null,
  );
  assert.equal(
    resolveVoiceSwapId({
      skillSlug: "cartoon-explainer-video-director",
      language: "en",
      cast: [{ voiceSample: { elevenVoiceId: "clone" } }],
    }),
    null,
  );
  assert.equal(videoCost(5, "doodle", Boolean(resolveVoiceSwapId(yue))), 50);
});

test("voice swap adds 1 credit per billed second", () => {
  assert.equal(videoCost(5, undefined, true), 50);
  assert.equal(videoCost(8, "realistic", true), 384);
  assert.equal(videoCost(3, undefined, true), 50);
  assert.equal(videoCost(5), 45);
});

test("mix keeps the video stream and ducks the original track under the new voice", () => {
  const args = mixVoiceArgs("in.mp4", "voice.mp3", "out.mp4");
  assert.deepEqual(args.slice(args.indexOf("-map"), args.indexOf("-map") + 4), ["-map", "0:v", "-map", "[a]"]);
  assert.equal(args[args.indexOf("-c:v") + 1], "copy");
  assert.match(VOICE_SWAP_FILTER, /\[bed\]\[key\]sidechaincompress/);
  assert.match(VOICE_SWAP_FILTER, /amix=inputs=2:duration=first/);
});
