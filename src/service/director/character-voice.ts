import {
  isCharacterVoice,
  VOICE_NOTE_MAX,
  type CharacterVoice,
} from "@/model/character-voice";

export const DEFAULT_CHARACTER_VOICE: CharacterVoice = {
  gender: "male",
  age: "adult",
  pitch: "mid",
  resonance: "mixed",
  texture: "warm",
  weight: "medium",
};

type NamedVoice = { name: string; voice?: CharacterVoice | null };

// One short line per speaker. The shared rule lives once on the cast, not on every name.
export function characterVoiceFingerprint(name: string, voice: CharacterVoice): string {
  const age = voice.age === "young-adult" ? "young adult" : voice.age === "older" ? "older" : "adult";
  const weight = voice.weight ?? "medium";
  const note = voice.note?.replace(/\s+/g, " ").trim().slice(0, VOICE_NOTE_MAX);
  const core = `${name}: ${age} ${voice.gender}, ${voice.pitch}, ${voice.resonance}, ${voice.texture}, ${weight}`;
  return note ? `${core}, ${note}.` : `${core}.`;
}

export function lockedSpeakerLines(cast?: NamedVoice[]): string[] {
  if (!cast) return [];
  return cast.flatMap((member) => {
    const name = member.name.trim();
    if (!name || !isCharacterVoice(member.voice)) return [];
    return [characterVoiceFingerprint(name, member.voice)];
  });
}

// Dialogue skills paste this instead of asking the model to invent a voice from the look.
export function dialogueVoiceLock(cast?: NamedVoice[]): string | null {
  const lines = lockedSpeakerLines(cast);
  if (!lines.length || !cast) return null;
  const lockedNames = new Set(
    cast.flatMap((member) => {
      const name = member.name.trim();
      return name && isCharacterVoice(member.voice) ? [name] : [];
    }),
  );
  const missing = cast.map((member) => member.name.trim()).filter((name) => name && !lockedNames.has(name));
  const fallback = missing.length
    ? `Unlocked (${missing.join(", ")}): match the frames and keep that voice.`
    : "Do not invent a timbre for a locked speaker.";
  return [
    "No narrator. Copy each voice lock verbatim. Same accent as the spoken language. Change only emotion or volume.",
    ...lines,
    fallback,
  ].join("\n");
}
