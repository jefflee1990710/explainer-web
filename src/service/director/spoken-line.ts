import type { CharacterVoice } from "@/model/character-voice";
import type { PerformanceSlots } from "@/model/director-performance";
import type { VoiceGender } from "@/model/project";
import { characterVoiceTimbre, firstLockedCharacterVoice } from "@/service/director/character-voice";
import { CARTOON_EXPLAINER_SKILL_SLUG } from "@/service/director/dual-beat";
import { skillBansNarration, storyShortCameraLock } from "@/service/director/skill-rules";
import {
  clipUsesTalkingPerformance,
  talkingShotForSkill,
  talkingVideoMotionRules,
} from "@/service/director/talking-performance";

// MiniMax must hear on-screen speech, not an off-camera narrator.
export const DIALOGUE_SPEAK_LOCK =
  'On-screen characters MUST speak the dialogue aloud with visible mouth movement. No off-screen narrator. If a line is NAME: "text", that named character in the frame says it. A silent beat stays silent.';

export function spokenLineCopy(skillSlug?: string) {
  if (skillBansNarration(skillSlug)) {
    return {
      section: "對白",
      field: (language: string) => `對白（${language}）`,
      startField: (language: string) => `開頭對白（${language}）`,
      endField: (language: string) => `結尾對白（${language}）`,
      placeholder: '角色要說的話，格式 NAME: "line"。沒有對白就寫 (no dialogue)。',
      startPlaceholder: "起始 beat 角色要說的話。",
      endPlaceholder: "結尾 beat 角色要說的話。",
      emptyError: "畫面描述與對白不能空白。",
      dualEmptyError: "起始／結尾畫面與兩句對白不能空白。",
      languageAria: "對白語言",
      languageChip: (language: string) => `${language} 對白`,
      hint: "影片裡由畫面上的角色開口說這句，不是旁白。",
    };
  }
  return {
    section: "旁白",
    field: (language: string) => `旁白（${language}）`,
    startField: (language: string) => `開頭旁白（${language}）`,
    endField: (language: string) => `結尾旁白（${language}）`,
    placeholder: "影片裡會照這句逐字唸出。",
    startPlaceholder: "起始 beat 要說的話，也會寫在起始畫格上。",
    endPlaceholder: "結尾 beat 要說的話，也會寫在結尾畫格上。",
    emptyError: "畫面描述與旁白不能空白。",
    dualEmptyError: "起始／結尾畫面與兩句旁白不能空白。",
    languageAria: "旁白語言",
    languageChip: (language: string) => `${language} 旁白`,
    hint: "影片裡會照這句逐字唸出。",
  };
}

// `NAME: "line"` / `名字：「台詞」` blocks; the name is for voice casting, never on screen.
const SPEAKER_LINE = /([^:：\n"“「]{1,40})[:：]\s*["“「]([^"”」]*)["”」]/g;

// A beat with nothing to say. Must not become a subtitle that reads "(no dialogue)".
export function isSilentSpokenLine(line: string) {
  return /^\(?\s*no dialogue\s*\)?$/i.test(line.trim());
}

// On-screen subtitle text: only the spoken words, no speaker labels or quotes.
export function speakerTurns(line: string): Array<{ name: string; line: string }> {
  return [...line.matchAll(SPEAKER_LINE)].flatMap((match) => {
    const name = match[1]?.replace(/^[\s,.;]+/, "").trim() ?? "";
    const spoken = match[2]?.trim() ?? "";
    if (!name || !spoken) return [];
    return [{ name, line: spoken }];
  });
}

export function subtitleText(line: string) {
  const text = line.trim();
  if (isSilentSpokenLine(text)) return "";
  const spoken = speakerTurns(text).map((turn) => turn.line);
  return spoken.length ? spoken.join(" ") : text;
}

// The person who says the line moves their mouth. Everyone else stays shut.
export function speakingMouthLock(line: string, castNames?: string[]) {
  const text = line.trim();
  if (!text || isSilentSpokenLine(text)) return "";
  const turns = speakerTurns(text);
  if (!turns.length) {
    const spoken = subtitleText(text);
    if (!spoken) return "";
    return `Mouth: the on-screen speaker lip-syncs every syllable of "${spoken}". Every other character's mouth stays closed. No off-screen narrator.`;
  }
  const speaking = new Set(turns.map((turn) => turn.name));
  const listeners = (castNames ?? []).map((name) => name.trim()).filter((name) => name && !speaking.has(name));
  const closed =
    listeners.length === 1
      ? `${listeners[0]}'s mouth stays closed`
      : listeners.length
        ? `${listeners.join(" and ")}'s mouths stay closed`
        : "every other character's mouth stays closed";
  const beats = turns
    .map((turn) => `${turn.name}'s mouth lip-syncs every syllable of "${turn.line}". While ${turn.name} speaks, ${closed}.`)
    .join(" ");
  return `Mouth: only the speaking character lip-syncs. ${beats} Do not move a listener's mouth as if they are talking.`;
}

// Cartoon explainer is always narrated. The line goes first so a long motion
// prompt cannot bury it, and sound effects cannot stand in for the voice.
// Lock the narrator's gender/timbre right on the opening line so the video model
// does not default the "unseen off-screen narrator" to a generic male voice when
// the on-screen character's mouth is closed.
export function narratorSpeechLock(
  line: string,
  options?: {
    voiceGender?: VoiceGender;
    speakers?: Array<{ name: string; voice?: CharacterVoice | null }>;
  },
) {
  const spoken = subtitleText(line).replaceAll('"', "'");
  if (!spoken) return "";
  const charVoice = firstLockedCharacterVoice(options?.speakers);
  const gender: VoiceGender | undefined = charVoice?.gender ?? options?.voiceGender;
  const opposite = gender === "female" ? "male" : gender === "male" ? "female" : undefined;
  const voiceTag = charVoice
    ? ` (${characterVoiceTimbre(charVoice)} — never switch to a ${opposite} voice)`
    : gender
      ? ` (adult ${gender} voice — never switch to a ${opposite} voice)`
      : "";
  return `AUDIO REQUIRED, spoken once by an unseen off-screen narrator${voiceTag}, starting in the first half-second, loud and clear, word for word: "${spoken}". Sound effects never replace this voice. This clip is never silent. The on-screen character's mouth stays closed.`;
}

export function talkingSpeakerSpeechLock(
  line: string,
  options?: {
    voiceGender?: VoiceGender;
    speakers?: Array<{ name: string; voice?: CharacterVoice | null }>;
  },
) {
  const spoken = subtitleText(line).replaceAll('"', "'");
  if (!spoken) return "";
  const charVoice = firstLockedCharacterVoice(options?.speakers);
  const gender: VoiceGender | undefined = charVoice?.gender ?? options?.voiceGender;
  const opposite = gender === "female" ? "male" : gender === "male" ? "female" : undefined;
  const voiceTag = charVoice
    ? ` (${characterVoiceTimbre(charVoice)} — never switch to a ${opposite} voice, no off-screen narrator, no sound effects)`
    : gender
      ? ` (adult ${gender} voice — never switch to a ${opposite} voice, no off-screen narrator, no sound effects)`
      : " (no off-screen narrator, no sound effects)";
  return `ON-SCREEN SPEECH REQUIRED${voiceTag}: from 0s the character on screen speaks aloud with continuous visible lip-sync: "${spoken}".`;
}

const COMPACT_TALKING_MOTION_LOCK =
  "This clip is on-camera speech, like a real person recording a reel, not a snap action and not a frozen pose. The mouth articulates every syllable of the spoken line with visible lip-sync from 0s and never speaks while the mouth is closed. Do not freeze the neck, head angle, or shoulders in one spot. Do not write snaps, flicks, whips, or pops for the face or body. Camera locked.";

// Appended when submitting a story-short / Q&A clip so the model cannot skip
// speech; story shorts also get the third-person camera lock.
export function lockDialogueSpeech(
  prompt: string,
  skillSlug?: string,
  spokenLine?: string,
  castNames?: string[],
  // Talking-head performance slots (English) so the appended lock matches a customised director.
  performance?: PerformanceSlots,
  voiceOptions?: {
    voiceGender?: VoiceGender;
    speakers?: Array<{ name: string; voice?: CharacterVoice | null }>;
  },
) {
  let body = prompt.trim();
  if (skillBansNarration(skillSlug)) {
    // A second pass must not quote the whole prompt, including an earlier mouth lock.
    const mouth = /(?:^|\n)Mouth: /.test(body)
      ? ""
      : speakingMouthLock(spokenLine?.trim() || body, castNames);
    for (const lock of [DIALOGUE_SPEAK_LOCK, mouth, storyShortCameraLock(skillSlug)]) {
      if (lock && !body.includes(lock)) body = `${body}\n\n${lock}`;
    }
    return body;
  }
  if (clipUsesTalkingPerformance(skillSlug)) {
    const shot = talkingShotForSkill(skillSlug) ?? "face";
    body = body
      .replace(/^ON-SCREEN SPEECH REQUIRED[^\n]*\n\n/, "")
      .replace(/The unseen off-screen narrator MUST use/g, "The on-screen speaker MUST use")
      .replace(
        /Spoken audio and short synced SFX only\./g,
        "Clean spoken voice only — no sound effects (no clapping, tapping, typing, or Foley SFX).",
      );
    const hasInlineTalkingChoreography =
      /with continuous lip-sync|口型跟住講/.test(body) &&
      /changing shape every 1–2 seconds|每 1–2 秒換一個手勢/.test(body);
    if (hasInlineTalkingChoreography) {
      body = body.replace(
        /\n\nThis clip is on-camera speech, like a real person recording a reel[\s\S]*?Camera locked\./g,
        "",
      );
    }
    const motionRule = hasInlineTalkingChoreography
      ? COMPACT_TALKING_MOTION_LOCK
      : talkingVideoMotionRules(shot, performance);
    for (const lock of [DIALOGUE_SPEAK_LOCK, motionRule]) {
      if (lock && !body.includes(lock)) body = `${body}\n\n${lock}`;
    }
    const topLock = talkingSpeakerSpeechLock(spokenLine ?? "", voiceOptions);
    if (topLock && !body.includes(topLock)) {
      body = `${topLock}\n\n${body}`;
    }
    return body;
  }
  if (skillSlug === CARTOON_EXPLAINER_SKILL_SLUG) {
    const lock = narratorSpeechLock(spokenLine ?? "", voiceOptions);
    if (lock) {
      // Replace an earlier generic AUDIO REQUIRED header if one is already at the top.
      body = body.replace(/^AUDIO REQUIRED, spoken once by an unseen off-screen narrator[^\n]*\n\n/, "");
      if (!body.includes(lock)) body = `${lock}\n\n${body}`;
    }
  }
  return body;
}
