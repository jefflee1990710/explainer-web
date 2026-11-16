import { voiceSwapVoiceId } from "@/model/character-voice-sample";

// Premade narrators already on the ElevenLabs account. One id per gender so every
// clip in a video is the same speaker. The old Rachel id (21m00Tcm4TlvDq8ikWAM)
// now resolves to Janet, an English woman, which is why a male project still
// sounded like a different woman on each clip.
export const MALE_NARRATOR_VOICE_ID = "nPczCjzI2devNBz1zQrb"; // Brian
export const FEMALE_NARRATOR_VOICE_ID = "hpp4J3VqNfWAUOO0d1Us"; // Bella
// Native Hong Kong voices. eleven_v4 on an English premade voice improvises a new
// Cantonese accent per request.
export const YUE_MALE_NARRATOR_VOICE_ID = "kWb73BrEnNOO40EVbd2k"; // Alan
export const YUE_FEMALE_NARRATOR_VOICE_ID = "pyCpQJNpFBywhVAwOzn6"; // Cathy

type NarratorGender = "male" | "female";

type VoiceSwapCastMember = {
  name?: string;
  voice?: { gender?: string } | null;
  voiceSample?: { elevenVoiceId?: string } | null;
  voiceSamples?: Partial<Record<string, { elevenVoiceId?: string } | undefined>> | null;
};

type VoiceSwapProject = {
  skillSlug?: string;
  language?: string;
  spokenLine?: string;
  voiceGender?: string;
  cast?: VoiceSwapCastMember[];
};

function asNarratorGender(value?: string): NarratorGender | null {
  return value === "male" || value === "female" ? value : null;
}

// Named dialogue uses that speaker's gender. A one-person cast uses the character
// gender. Otherwise the project narrator gender, which defaults to male.
function resolveNarratorGender(project: VoiceSwapProject): NarratorGender {
  const trimmed = project.spokenLine?.trim() || "";
  const speakerName = trimmed.match(/^([^:：\n"“「]{1,40})[:：]/)?.[1]?.trim().toLowerCase();
  if (speakerName && project.cast) {
    const matched = project.cast.find((member) => {
      const name = member.name?.trim().toLowerCase();
      return Boolean(name && (name === speakerName || speakerName.includes(name) || name.includes(speakerName)));
    });
    const matchedGender = asNarratorGender(matched?.voice?.gender);
    if (matchedGender) return matchedGender;
  }
  if (project.cast?.length === 1) {
    const solo = asNarratorGender(project.cast[0]?.voice?.gender);
    if (solo) return solo;
  }
  return asNarratorGender(project.voiceGender) ?? "male";
}

// Fixed ElevenLabs speaker for this language and gender.
export function narratorVoiceId(language?: string, voiceGender?: string): string {
  const gender = asNarratorGender(voiceGender) ?? "male";
  if (language === "yue") {
    return gender === "female" ? YUE_FEMALE_NARRATOR_VOICE_ID : YUE_MALE_NARRATOR_VOICE_ID;
  }
  return gender === "female" ? FEMALE_NARRATOR_VOICE_ID : MALE_NARRATOR_VOICE_ID;
}

function memberElevenVoiceId(member?: VoiceSwapCastMember, language?: string): string | null {
  if (!member) return null;
  if (language && member.voiceSamples?.[language]?.elevenVoiceId) {
    return member.voiceSamples[language]!.elevenVoiceId!;
  }
  return member.voiceSample?.elevenVoiceId || null;
}

// Match a multi-character dialogue line (`NAME: "line"`) to that speaker's cloned ElevenLabs voice.
function resolveDialogueSpeakerVoiceId(
  cast?: VoiceSwapCastMember[],
  language?: string,
  spokenLine?: string,
): string | null {
  if (!cast || cast.length < 2) return null;
  const trimmed = spokenLine?.trim() || "";
  const prefixMatch = trimmed.match(/^([^:：\n"“「]{1,40})[:：]/);
  const speakerName = prefixMatch?.[1]?.trim().toLowerCase();
  if (speakerName) {
    const matched = cast.find((member) => {
      const name = member.name?.trim().toLowerCase();
      return Boolean(name && (name === speakerName || speakerName.includes(name) || name.includes(speakerName)));
    });
    const matchedVoice = memberElevenVoiceId(matched, language);
    if (matchedVoice) return matchedVoice;
  }
  for (const member of cast) {
    const id = memberElevenVoiceId(member, language);
    if (id) return id;
  }
  return null;
}

// Every voiced project synthesizes speech on ElevenLabs first across all languages.
// A one-character cloned voice (or the named speaker's cloned voice in a 2-character Q&A) wins.
// Otherwise the same premade male or female narrator is used on every clip.
export function resolveVoiceSwapId(project: VoiceSwapProject): string | null {
  return (
    voiceSwapVoiceId(project.cast, project.language) ||
    resolveDialogueSpeakerVoiceId(project.cast, project.language, project.spokenLine) ||
    (project.language ? narratorVoiceId(project.language, resolveNarratorGender(project)) : null)
  );
}
