import type { MessageShape } from "@/util/i18n/messages/workspace/message-shape";

export const pickersEn = {
  voLanguage: {
    en: { label: "English", sublabel: "American English voiceover" },
    yue: { label: "Cantonese", sublabel: "Hong Kong colloquial" },
    zh: { label: "Chinese", sublabel: "Traditional Chinese (Mandarin)" },
  },
  sceneTextLang: {
    en: { label: "English", sublabel: "On-screen labels" },
    "zh-Hant": { label: "繁體中文", sublabel: "畫面文字" },
    "zh-Hans": { label: "简体中文", sublabel: "画面文字" },
  },
  subtitleLook: {
    handwritten: { label: "Handwritten", sublabel: "Marker, not a printed font" },
    clean: { label: "Clean", sublabel: "Sans on a white plate" },
    bold: { label: "Bold", sublabel: "Condensed display type" },
  },
  speechPace: {
    slow: { label: "Slow", sublabel: "Pauses between sentences" },
    medium: { label: "Medium", sublabel: "Natural conversation" },
    fast: { label: "Fast", sublabel: "Brisk, fewer pauses" },
  },
  voiceGender: {
    male: { label: "Male", sublabel: "Adult male narrator" },
    female: { label: "Female", sublabel: "Adult female narrator" },
  },
  duration: {
    auto: { label: "Auto", hint: "Director decides" },
    micro: { label: "4–8s micro", hint: "1–2 clips" },
    short: { label: "15–20s short", hint: "2–4 clips" },
    punchy: { label: "30–45s breakdown", hint: "4–6 clips" },
    full: { label: "50–60s explainer", hint: "7–10 clips" },
  },
} as const;


export type PickersMessages = MessageShape<typeof pickersEn>;
