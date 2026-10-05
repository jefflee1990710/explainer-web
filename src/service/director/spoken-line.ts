import { skillBansNarration, storyShortCameraLock } from "@/service/director/skill-rules";

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
const SPEAKER_LINE = /[^:：\n"“「]{1,40}?[:：]\s*["“「]([^"”」]*)["”」]/g;

// A beat with nothing to say. Must not become a subtitle that reads "(no dialogue)".
export function isSilentSpokenLine(line: string) {
  return /^\(?\s*no dialogue\s*\)?$/i.test(line.trim());
}

// On-screen subtitle text: only the spoken words, no speaker labels or quotes.
export function subtitleText(line: string) {
  const text = line.trim();
  if (isSilentSpokenLine(text)) return "";
  const spoken = [...text.matchAll(SPEAKER_LINE)].map((match) => match[1].trim()).filter(Boolean);
  return spoken.length ? spoken.join(" ") : text;
}

// Appended when submitting a story-short / Q&A clip so the model cannot skip
// speech; story shorts also get the third-person camera lock.
export function lockDialogueSpeech(prompt: string, skillSlug?: string) {
  let body = prompt.trim();
  if (!skillBansNarration(skillSlug)) return body;
  for (const lock of [DIALOGUE_SPEAK_LOCK, storyShortCameraLock(skillSlug)]) {
    if (lock && !body.includes(lock)) body = `${body}\n\n${lock}`;
  }
  return body;
}
