import type { MessageShape } from "@/util/i18n/messages/workspace/message-shape";

export const pickersEn = {
  voLanguage: {
    en: { label: "English", sublabel: "American English voiceover" },
    yue: { label: "Cantonese", sublabel: "Hong Kong colloquial" },
    zh: { label: "Chinese", sublabel: "Traditional Chinese (Mandarin)" },
    ja: { label: "日本語", sublabel: "Japanese voiceover" },
    ko: { label: "한국어", sublabel: "Korean voiceover" },
    id: { label: "Bahasa Indonesia", sublabel: "Indonesian voiceover" },
    es: { label: "Español", sublabel: "Spanish voiceover" },
    pt: { label: "Português", sublabel: "Portuguese voiceover" },
    fr: { label: "Français", sublabel: "French voiceover" },
    de: { label: "Deutsch", sublabel: "German voiceover" },
    ru: { label: "Русский", sublabel: "Russian voiceover" },
    vi: { label: "Tiếng Việt", sublabel: "Vietnamese voiceover" },
    th: { label: "ไทย", sublabel: "Thai voiceover" },
    ms: { label: "Bahasa Melayu", sublabel: "Malay voiceover" },
    fil: { label: "Filipino", sublabel: "Filipino / Tagalog voiceover" },
    hi: { label: "हिन्दी", sublabel: "Hindi voiceover" },
    ar: { label: "العربية", sublabel: "Arabic voiceover" },
    it: { label: "Italiano", sublabel: "Italian voiceover" },
    nl: { label: "Nederlands", sublabel: "Dutch voiceover" },
    pl: { label: "Polski", sublabel: "Polish voiceover" },
    tr: { label: "Türkçe", sublabel: "Turkish voiceover" },
  },
  sceneTextLang: {
    en: { label: "English", sublabel: "On-screen labels" },
    "zh-Hant": { label: "繁體中文", sublabel: "畫面文字" },
    "zh-Hans": { label: "简体中文", sublabel: "画面文字" },
    none: { label: "None", sublabel: "No writing" },
  },
  subtitleLook: {
    handwritten: { label: "Marker", sublabel: "Black marker on torn paper" },
    clean: { label: "Torn paper", sublabel: "Black strip and green strip" },
    bold: { label: "Impact", sublabel: "Worn white type, yellow brush" },
    neon: { label: "Neon", sublabel: "Cyan tube glow" },
    comic: { label: "Comic", sublabel: "Yellow fill, black outline" },
    chalk: { label: "Chalk", sublabel: "White chalk on green" },
    gold: { label: "Gold", sublabel: "Metallic serif foil" },
    typewriter: { label: "Typewriter", sublabel: "Stamped monospace" },
    graffiti: { label: "Spray", sublabel: "Dripping bubble letters" },
    sticker: { label: "Sticker", sublabel: "Red type on a die-cut" },
    glitch: { label: "Glitch", sublabel: "RGB split pixels" },
    brush: { label: "Brush", sublabel: "Wet black ink" },
    outline: { label: "Outline", sublabel: "Hollow navy blocks" },
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
