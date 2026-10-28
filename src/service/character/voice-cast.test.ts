import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId } from "mongodb";
import type { CastMember, Character } from "@/model/character";
import { mergeCurrentCharacterVoices } from "@/service/character/voice-cast";

test("mergeCurrentCharacterVoices syncs both current voice lock and latest voiceSample from characters", () => {
  const charId = new ObjectId("6ad447d920897d3c6771ccb4");
  const verId = new ObjectId("6ad447d920897d3c6771ccb3");

  const cast: CastMember[] = [
    {
      characterId: charId,
      versionId: verId,
      name: "Alice",
      blueprintUrl: "https://example.com/blueprint.png",
      prompt: "",
    },
  ];

  const characterDoc = {
    _id: charId,
    voice: {
      gender: "female",
      age: "young-adult",
      pitch: "mid-high",
      resonance: "bright",
      texture: "warm",
      weight: "light",
    },
    voiceSample: {
      url: "https://example.com/alice-voice.wav",
      durationSeconds: 15,
      elevenVoiceId: "AlY88XuxqPLuBzrEimDn",
      uploadedAt: new Date("2026-10-19T02:49:55.108Z"),
    },
  } as Pick<Character, "_id" | "voice" | "voiceSample">;

  const merged = mergeCurrentCharacterVoices(cast, [characterDoc]);
  assert.equal(merged?.[0]?.voice?.gender, "female");
  assert.deepEqual(merged?.[0]?.voiceSample, {
    url: "https://example.com/alice-voice.wav",
    elevenVoiceId: "AlY88XuxqPLuBzrEimDn",
  });
});

test("mergeCurrentCharacterVoices removes stale voiceSample when character sample was removed", () => {
  const charId = new ObjectId("6ad447d920897d3c6771ccb4");
  const verId = new ObjectId("6ad447d920897d3c6771ccb3");

  const cast: CastMember[] = [
    {
      characterId: charId,
      versionId: verId,
      name: "Alice",
      blueprintUrl: "https://example.com/blueprint.png",
      prompt: "",
      voiceSample: {
        url: "https://example.com/old.wav",
        elevenVoiceId: "old_voice_id",
      },
    },
  ];

  const characterDoc = {
    _id: charId,
  } as Pick<Character, "_id" | "voice" | "voiceSample">;

  const merged = mergeCurrentCharacterVoices(cast, [characterDoc]);
  assert.equal(merged?.[0]?.voiceSample, undefined);
});

test("mergeCurrentCharacterVoices omits voiceSample and voiceSamples when voiceMode is 'lock'", () => {
  const charId = new ObjectId("6ae0d86cf75348b44a26322c");
  const verId = new ObjectId("6ae14d3b7d449728658a0f98");

  const cast: CastMember[] = [
    {
      characterId: charId,
      versionId: verId,
      name: "Scro",
      blueprintUrl: "https://example.com/scro.png",
      prompt: "",
      voiceSample: {
        url: "https://example.com/sting.mp3",
        elevenVoiceId: "fE3jtPUA7zZ3vjTekQhI",
      },
      voiceSamples: {
        en: {
          url: "https://example.com/sting.mp3",
          elevenVoiceId: "fE3jtPUA7zZ3vjTekQhI",
        },
      },
    },
  ];

  const characterDoc = {
    _id: charId,
    voiceMode: "lock" as const,
    voice: {
      gender: "female" as const,
      age: "young-adult" as const,
      pitch: "high" as const,
      resonance: "bright" as const,
      texture: "soft" as const,
      weight: "light" as const,
      note: "gentle and airy tone",
    },
    voiceSample: {
      url: "https://example.com/sting.mp3",
      durationSeconds: 6.03,
      elevenVoiceId: "fE3jtPUA7zZ3vjTekQhI",
      uploadedAt: new Date("2026-10-28T19:27:06.316Z"),
    },
    voiceSamples: {
      en: {
        url: "https://example.com/sting.mp3",
        durationSeconds: 6.03,
        elevenVoiceId: "fE3jtPUA7zZ3vjTekQhI",
        uploadedAt: new Date("2026-10-28T19:27:06.316Z"),
      },
    },
  };

  const merged = mergeCurrentCharacterVoices(cast, [characterDoc]);
  assert.equal(merged?.[0]?.voice?.gender, "female");
  assert.equal(merged?.[0]?.voiceSample, undefined);
  assert.equal(merged?.[0]?.voiceSamples, undefined);
});

