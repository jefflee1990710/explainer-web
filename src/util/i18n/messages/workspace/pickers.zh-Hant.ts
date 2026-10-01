import type { PickersMessages } from "@/util/i18n/messages/workspace/pickers.en";

export const pickersZhHant = {
  voLanguage: {
    en: { label: "English", sublabel: "美式英文口語" },
    yue: { label: "廣東話", sublabel: "香港口語白話" },
    zh: { label: "中文", sublabel: "繁體中文（國語）" },
  },
  sceneTextLang: {
    en: { label: "English", sublabel: "英文標籤" },
    "zh-Hant": { label: "繁體中文", sublabel: "畫面文字" },
    "zh-Hans": { label: "简体中文", sublabel: "画面文字" },
  },
  speechPace: {
    slow: { label: "慢", sublabel: "從容、句間停頓" },
    medium: { label: "中", sublabel: "自然對話速度" },
    fast: { label: "快", sublabel: "輕快、少停頓" },
  },
  voiceGender: {
    male: { label: "男聲", sublabel: "成年男聲旁白" },
    female: { label: "女聲", sublabel: "成年女聲旁白" },
  },
  duration: {
    micro: { label: "4–8 秒微短片", hint: "1–2 段 clips" },
    short: { label: "15–20 秒短片", hint: "2–4 段 clips" },
    punchy: { label: "30–45 秒拆解", hint: "4–6 段 clips" },
    full: { label: "50–60 秒完整 explainer", hint: "7–10 段 clips" },
  },
} satisfies PickersMessages;
