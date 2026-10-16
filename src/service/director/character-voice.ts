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

// Timbre descriptor without the character name prefix, for narrator or speaker locks.
export function characterVoiceTimbre(voice: CharacterVoice): string {
  const age = voice.age === "young-adult" ? "young adult" : voice.age === "older" ? "older" : "adult";
  const weight = voice.weight ?? "medium";
  const note = voice.note?.replace(/\s+/g, " ").trim().slice(0, VOICE_NOTE_MAX);
  const core = `${age} ${voice.gender}, ${voice.pitch}, ${voice.resonance}, ${voice.texture}, ${weight}`;
  return note ? `${core}, ${note}` : core;
}

// One short line per speaker. The shared rule lives once on the cast, not on every name.
export function characterVoiceFingerprint(name: string, voice: CharacterVoice): string {
  return `${name}: ${characterVoiceTimbre(voice)}.`;
}

export function lockedSpeakerLines(cast?: NamedVoice[]): string[] {
  if (!cast) return [];
  return cast.flatMap((member) => {
    const name = member.name.trim();
    if (!name || !isCharacterVoice(member.voice)) return [];
    return [characterVoiceFingerprint(name, member.voice)];
  });
}

// First locked character voice, used when an unseen narrator must use the character's voice timbre.
export function firstLockedCharacterVoice(cast?: NamedVoice[]): CharacterVoice | undefined {
  if (!cast) return undefined;
  for (const member of cast) {
    if (member.name.trim() && isCharacterVoice(member.voice)) {
      return member.voice;
    }
  }
  return undefined;
}

// Every speaking director pastes this instead of inventing a timbre from the look.
export function dialogueVoiceLock(
  cast?: NamedVoice[],
  unlockedLock?: string,
  options?: { keepNarrator?: boolean },
): string | null {
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
    ? `Unlocked (${missing.join(", ")}): ${unlockedLock || "use the project voice lock verbatim. Do not invent a timbre from the look."}`
    : "Do not invent a timbre for a locked speaker.";
  const firstVoice = options?.keepNarrator ? firstLockedCharacterVoice(cast) : undefined;
  const oppositeGender = firstVoice ? (firstVoice.gender === "female" ? "male" : "female") : undefined;
  const narratorLine = firstVoice
    ? `The unseen off-screen narrator MUST use this exact ${firstVoice.gender} voice timbre (${characterVoiceTimbre(firstVoice)}); never switch to a ${oppositeGender} voice.`
    : "";
  const preamble = options?.keepNarrator
    ? "Copy each voice lock verbatim. Same accent as the spoken language. Change only emotion or volume."
    : "No narrator. Copy each voice lock verbatim. Same accent as the spoken language. Change only emotion or volume.";
  return [preamble, ...lines, narratorLine, fallback].filter(Boolean).join("\n");
}
