import { voiceSwapVoiceId } from "@/model/character-voice-sample";

// Premade multilingual voice (Rachel). Speech-to-speech keeps the source timing,
// so Cantonese lip-sync stays when the cast has no cloned demo.
export const CANTONESE_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

type VoiceSwapCastMember = {
  name?: string;
  voiceSample?: { elevenVoiceId?: string } | null;
  voiceSamples?: Partial<Record<string, { elevenVoiceId?: string } | undefined>> | null;
};

type VoiceSwapProject = {
  skillSlug?: string;
  language?: string;
  spokenLine?: string;
  cast?: VoiceSwapCastMember[];
};

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
// A one-character cloned voice (or the named speaker's cloned voice in a 2-character Q&A) wins;
// otherwise any project with a configured `language` falls back to the premade multilingual voice.
export function resolveVoiceSwapId(project: VoiceSwapProject): string | null {
  return (
    voiceSwapVoiceId(project.cast, project.language) ||
    resolveDialogueSpeakerVoiceId(project.cast, project.language, project.spokenLine) ||
    (project.language ? CANTONESE_VOICE_ID : null)
  );
}
