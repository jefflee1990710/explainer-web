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
  subtitleLook: {
    handwritten: { label: "馬克筆", sublabel: "撕紙上的黑筆手寫" },
    clean: { label: "撕紙", sublabel: "黑條與綠條" },
    bold: { label: "衝擊字", sublabel: "磨損白字，黃刷底" },
    neon: { label: "霓虹", sublabel: "青色燈管光" },
    comic: { label: "漫畫", sublabel: "黃填色、黑描邊" },
    chalk: { label: "粉筆", sublabel: "綠板上的白粉筆" },
    gold: { label: "金箔", sublabel: "金屬襯線" },
    typewriter: { label: "打字機", sublabel: "墨水等寬字" },
    graffiti: { label: "噴漆", sublabel: "滴漆泡泡字" },
    sticker: { label: "貼紙", sublabel: "模切貼紙上的紅字" },
    glitch: { label: "故障", sublabel: "紅藍錯位像素" },
    brush: { label: "毛筆", sublabel: "濕黑墨" },
    outline: { label: "空心", sublabel: "海軍藍空心塊字" },
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
    auto: { label: "自動", hint: "導演決定" },
    micro: { label: "4–8 秒微短片", hint: "1–2 段 clips" },
    short: { label: "15–20 秒短片", hint: "2–4 段 clips" },
    punchy: { label: "30–45 秒拆解", hint: "4–6 段 clips" },
    full: { label: "50–60 秒完整 explainer", hint: "7–10 段 clips" },
  },
} satisfies PickersMessages;
