import { CANTONESE_JYUTPING } from "@/service/voice/cantonese-jyutping";

// The video model voices Cantonese clips itself and ElevenLabs only swaps the
// timbre, so the reading has to be right when the clip is generated.

// English words said in English, written as stressed syllables.
const ENGLISH_SOUNDS: Record<string, string> = {
  webinar: "WEB-ih-nar",
  instagram: "IN-stuh-gram",
  ig: "I-G",
  dm: "D-M",
  facebook: "FAYS-book",
  youtube: "YOO-toob",
  online: "ON-line",
  app: "ap",
};

// Keeps the prompt short when a long line hits many words.
const MAX_JYUTPING = 12;

// Extra lines for a Cantonese clip prompt: language lock, English words, Jyutping.
export function cantonesePronunciationLock(line?: string) {
  const text = line?.trim() ?? "";
  if (!text) return "";
  const english = [...new Set(text.match(/[A-Za-z][A-Za-z'-]*/g) ?? [])].map((word) => {
    const sound = ENGLISH_SOUNDS[word.toLowerCase()];
    return sound ? `"${word}" = ${sound}` : `"${word}"`;
  });
  const jyutping = CANTONESE_JYUTPING.filter(([word]) => text.includes(word))
    .slice(0, MAX_JYUTPING)
    .map(([word, sound]) => `${word} = ${sound}`);
  const parts = ["Speech language: Hong Kong Cantonese (廣東話) only, never Mandarin. Read every Chinese character with its Cantonese sound."];
  if (english.length) parts.push(`Say these English words in natural English, not as Chinese syllables: ${english.join(", ")}.`);
  if (jyutping.length) parts.push(`Pronunciation (Jyutping): ${jyutping.join(", ")}.`);
  return parts.join(" ");
}

// Appends the pronunciation lock once to a Cantonese clip prompt.
export function withCantonesePronunciation(prompt: string, language: string | undefined, line?: string) {
  if (language !== "yue") return prompt;
  const lock = cantonesePronunciationLock(line);
  if (!lock || prompt.includes(lock)) return prompt;
  return `${prompt}\n\n${lock}`;
}
