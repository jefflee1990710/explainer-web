import type { HeroLang } from "@/presentation/components/landing-hero-canvas-copy";

export type ShowcaseStep = { title: string; body: string };

export type ShowcaseCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  tryWith: string;
  steps: [ShowcaseStep, ShowcaseStep, ShowcaseStep, ShowcaseStep];
  stageTitle: string;
  run: string;
  ready: string;
  placeholder: string;
  assistant: string;
  assistantReply: string;
  cta: string;
  ctaNote: string;
};

// Section copy for the four-step "idea → finished reel" walkthrough.
export const SHOWCASE_COPY: Record<HeroLang, ShowcaseCopy> = {
  en: {
    eyebrow: "Scro Canvas · Idea to reel in 4 steps",
    title: "From idea to a finished short in four steps.",
    subtitle:
      "No editing software and no prompt tricks. Pick a workflow, connect the blocks or ask the AI Assistant, then press Run.",
    tryWith: "Try it with",
    steps: [
      { title: "Pick a workflow or drop blocks", body: "Start from a ready workflow, or drag in Script, Character, and Voice blocks." },
      { title: "Connect them", body: "Drag from one block to the next. Each block shows what it still needs." },
      { title: "Or just ask the AI Assistant", body: "Describe the reel in one sentence. The assistant adds and connects the blocks for you." },
      { title: "Press Run, get the reel", body: "Scro renders every scene, adds the voice, and merges one ready-to-post short." },
    ],
    stageTitle: "Scro Canvas",
    run: "Run",
    ready: "Ready",
    placeholder: "Your reel appears here",
    assistant: "AI Assistant",
    assistantReply: "Blocks added and connected. Press Run.",
    cta: "Open This Workflow in Canvas",
    ctaNote: "Free to set up. You only pay when you press Run.",
  },
  "zh-Hant": {
    eyebrow: "Scro Canvas · 4 步由想法到成片",
    title: "由一個想法到完成短片，只需四步。",
    subtitle: "唔使識剪片，唔使學寫提示詞。揀好流程、接好積木或者問 AI 助理，然後撳執行。",
    tryWith: "試吓用",
    steps: [
      { title: "揀流程或者放入積木", body: "由現成流程開始，或者拖入講稿、角色同配音積木。" },
      { title: "接好佢哋", body: "由一個積木拉去下一個，每個積木都會提你仲欠乜。" },
      { title: "或者直接問 AI 助理", body: "一句話講你想要咩片，助理會自動幫你放好接好。" },
      { title: "撳執行，攞成片", body: "Scro 自動生成每個場景、加配音，再合成一條可以直接發佈嘅短片。" },
    ],
    stageTitle: "Scro Canvas",
    run: "執行",
    ready: "完成",
    placeholder: "成片會喺呢度出現",
    assistant: "AI 助理",
    assistantReply: "積木已經放好接好，撳執行就得。",
    cta: "在 Canvas 打開此範本",
    ctaNote: "設定免費，撳執行先收費。",
  },
  "zh-Hans": {
    eyebrow: "Scro Canvas · 4 步从想法到成片",
    title: "从一个想法到完成短视频，只需四步。",
    subtitle: "不用会剪辑，也不用学写提示词。选好流程、接好积木或问 AI 助理，然后点运行。",
    tryWith: "试试用",
    steps: [
      { title: "选流程或放入积木", body: "从现成流程开始，或拖入讲稿、角色和配音积木。" },
      { title: "把它们接好", body: "从一个积木拉到下一个，每个积木都会提示还缺什么。" },
      { title: "或者直接问 AI 助理", body: "一句话描述你想要的视频，助理会自动放好接好。" },
      { title: "点运行，拿成片", body: "Scro 自动生成每个场景、加配音，再合成一条可直接发布的短视频。" },
    ],
    stageTitle: "Scro Canvas",
    run: "运行",
    ready: "完成",
    placeholder: "成片会在这里出现",
    assistant: "AI 助理",
    assistantReply: "积木已放好接好，点运行即可。",
    cta: "在 Canvas 打开此模板",
    ctaNote: "设置免费，点运行才计费。",
  },
};
