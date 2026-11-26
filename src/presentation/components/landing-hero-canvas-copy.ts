// Labels shown inside the hero canvas illustration, per public locale.
export type HeroLang = "en" | "zh-Hant" | "zh-Hans";

export type HeroCanvasCopy = {
  windowTitle: string;
  run: string;
  prompt: string;
  promptText: string;
  character: string;
  characterName: string;
  voice: string;
  voiceText: string;
  video: string;
  rendering: string;
  mix: string;
  mixText: string;
  reel: string;
  ready: string;
  assistant: string;
  ask: string;
  reply: string;
};

export const HERO_CANVAS_COPY: Record<HeroLang, HeroCanvasCopy> = {
  en: {
    windowTitle: "Scro Canvas · Compound interest reel",
    run: "Run",
    prompt: "Script",
    promptText: "30s explainer: why compound interest snowballs.",
    character: "Character",
    characterName: "Mei · face locked",
    voice: "AI Voice",
    voiceText: "English · warm narrator",
    video: "Video",
    rendering: "Rendering 3 scenes",
    mix: "Merge & Voice",
    mixText: "3 clips + voiceover",
    reel: "Finished Reel",
    ready: "Ready · 9:16",
    assistant: "AI Assistant",
    ask: "Make a 30s explainer on compound interest with Mei.",
    reply: "Done. 6 blocks set up and connected. Press Run.",
  },
  "zh-Hant": {
    windowTitle: "Scro Canvas · 複利解說短片",
    run: "執行",
    prompt: "講稿",
    promptText: "30 秒解說：點解複利會越滾越大？",
    character: "角色",
    characterName: "Mei · 樣貌鎖定",
    voice: "AI 配音",
    voiceText: "廣東話 · 親切旁白",
    video: "影片",
    rendering: "生成緊 3 個場景",
    mix: "合片 + 配音",
    mixText: "3 段片 + 旁白",
    reel: "完成短片",
    ready: "完成 · 9:16",
    assistant: "AI 助理",
    ask: "用 Mei 幫我整一條 30 秒複利解說片。",
    reply: "搞掂！6 個積木已經排好接好，撳執行就得。",
  },
  "zh-Hans": {
    windowTitle: "Scro Canvas · 复利解说短视频",
    run: "运行",
    prompt: "讲稿",
    promptText: "30 秒解说：为什么复利会越滚越大？",
    character: "角色",
    characterName: "Mei · 样貌锁定",
    voice: "AI 配音",
    voiceText: "普通话 · 亲切旁白",
    video: "视频",
    rendering: "正在生成 3 个场景",
    mix: "合片 + 配音",
    mixText: "3 段视频 + 旁白",
    reel: "完成短视频",
    ready: "完成 · 9:16",
    assistant: "AI 助理",
    ask: "用 Mei 帮我做一条 30 秒复利解说视频。",
    reply: "好了！6 个积木已排好接好，点运行即可。",
  },
};

export function heroLang(locale: string): HeroLang {
  return locale === "zh-Hant" ? "zh-Hant" : locale === "zh-Hans" ? "zh-Hans" : "en";
}
