import type { CanvasStarterTemplateId } from "@/service/canvas/core/templates";

export function canvasLaunchHref(
  signedIn: boolean,
  templateId?: CanvasStarterTemplateId,
): string {
  const target = templateId
    ? `/app/canvas?template=${encodeURIComponent(templateId)}`
    : "/app/canvas";
  if (signedIn) return target;
  return `/sign-up?next=${encodeURIComponent(target)}`;
}

export type CanvasPublicTemplateCard = {
  id: CanvasStarterTemplateId;
  badge: { en: string; "zh-Hant": string; "zh-Hans": string };
  videoUrl?: string;
  posterUrl: string;
  title: { en: string; "zh-Hant": string; "zh-Hans": string };
  description: { en: string; "zh-Hant": string; "zh-Hans": string };
  steps: { en: string[]; "zh-Hant": string[]; "zh-Hans": string[] };
  aiPromptExample: { en: string; "zh-Hant": string; "zh-Hans": string };
};

// Public-facing metadata for all 6 Canvas templates in plain, non-technical creator copy.
export const CANVAS_PUBLIC_TEMPLATES: readonly CanvasPublicTemplateCard[] = [
  {
    id: "talking-head",
    badge: { en: "1080p Lip-Sync", "zh-Hant": "1080p 對嘴", "zh-Hans": "1080p 对口型" },
    videoUrl: "/hero/tools/talking-head/center.mp4",
    posterUrl: "/hero/tools/talking-head/center.webp",
    title: {
      en: "Talking Head Video",
      "zh-Hant": "真人口播短片",
      "zh-Hans": "真人口播短视频",
    },
    description: {
      en: "Type a script or drop voice audio—get a natural 1080p lip-sync creator video in minutes.",
      "zh-Hant": "輸入講稿或配音，幾分鐘自動生成嘴型、眼神同表情都極自然嘅 1080p 口播短片。",
      "zh-Hans": "输入讲稿或配音，几分钟自动生成嘴型、眼神与表情自然的 1080p 口播短视频。",
    },
    steps: {
      en: ["Write Script", "AI Voiceover", "1080p Lip-Sync"],
      "zh-Hant": ["輸入講稿", "AI 配音", "1080p 對嘴出片"],
      "zh-Hans": ["输入讲稿", "AI 配音", "1080p 对口型出片"],
    },
    aiPromptExample: {
      en: "Make a 30s Cantonese talking-head reel introducing our new serum.",
      "zh-Hant": "幫我整一條 30 秒廣東話口播片，介紹新款精華液。",
      "zh-Hans": "帮我做一条 30 秒口播视频，介绍新款精华液。",
    },
  },
  {
    id: "explainer",
    badge: { en: "Multi-Scene", "zh-Hant": "多鏡分鏡", "zh-Hans": "多镜分镜" },
    videoUrl: "/hero/tools/explainer/center.mp4",
    posterUrl: "/hero/tools/explainer/center.webp",
    title: {
      en: "AI Explainer Video",
      "zh-Hant": "AI 動畫解說短片",
      "zh-Hans": "AI 动画解说短视频",
    },
    description: {
      en: "Turn any idea, article, or product brief into a multi-scene animated explainer with voiceover.",
      "zh-Hant": "輸入任何想法或文章，自動規劃分鏡、白板／剪紙動畫、標題字卡同流暢旁白。",
      "zh-Hans": "输入任何想法或文章，自动规划分镜、白板/剪纸动画、标题字卡与流畅旁白。",
    },
    steps: {
      en: ["Enter Topic", "Auto Visuals", "Voiced Reel"],
      "zh-Hant": ["輸入主題", "自動分鏡畫格", "配音合片完成"],
      "zh-Hans": ["输入主题", "自动分镜画格", "配音成片完成"],
    },
    aiPromptExample: {
      en: "Explain compound interest in 3 visual scenes for Instagram Reels.",
      "zh-Hant": "用 3 個簡單比喻整一條 IG Reels 解說乜嘢係復利效應。",
      "zh-Hans": "用 3 个简单比喻做一条短视频解说什么是复利效应。",
    },
  },
  {
    id: "scro-swap",
    badge: { en: "Character Remix", "zh-Hant": "換角換裝", "zh-Hans": "换角换装" },
    videoUrl: "/hero/tools/scroswap/center.mp4",
    posterUrl: "/hero/tools/scroswap/center.webp",
    title: {
      en: "Character & Outfit Swap",
      "zh-Hant": "影片換角換裝",
      "zh-Hans": "视频换角换装",
    },
    description: {
      en: "Drop any clip and replace the person or outfit with your AI character—keeping every move and light.",
      "zh-Hant": "拖入任何實拍或參考影片，一鍵替換主角或穿搭，100% 保留原本動作同光影。",
      "zh-Hans": "拖入任何实拍或参考视频，一键替换主角或穿搭，100% 保留原本动作与光影。",
    },
    steps: {
      en: ["Drop Video", "Pick Character", "Swapped Video"],
      "zh-Hant": ["放入原片", "揀選角色", "保留動作出片"],
      "zh-Hans": ["放入原片", "选择角色", "保留动作出片"],
    },
    aiPromptExample: {
      en: "Swap the dancer in my clip to Mia wearing the summer linen outfit.",
      "zh-Hant": "將條片入面個主角換成 Mia，著夏日亞麻套裝。",
      "zh-Hans": "把视频里的主角换成 Mia，穿夏日亚麻套装。",
    },
  },
  {
    id: "teleport",
    badge: { en: "Scene Relocate", "zh-Hant": "實景換場", "zh-Hans": "实景换场" },
    videoUrl: "/hero/tools/teleport/center.mp4",
    posterUrl: "/hero/tools/teleport/center.webp",
    title: {
      en: "Scene Teleport",
      "zh-Hant": "人物實景換場",
      "zh-Hans": "人物实景换场",
    },
    description: {
      en: "Keep the same person, face, and performance while instantly moving them into any new location.",
      "zh-Hant": "留住原片人物五官同動作，一鍵傳送去東京咖啡店、巴黎街頭或攝影棚。",
      "zh-Hans": "留住原片人物五官与动作，一键传送去咖啡馆、街头或摄影棚。",
    },
    steps: {
      en: ["Source Clip", "Describe Scene", "New Location"],
      "zh-Hant": ["放入影片", "描述新場景", "秒速換場成片"],
      "zh-Hans": ["放入视频", "描述新场景", "秒速换场成片"],
    },
    aiPromptExample: {
      en: "Place this presenter inside a warm sunlit Kyoto cafe.",
      "zh-Hant": "將片入面嘅主持搬入溫暖陽光嘅京都咖啡店。",
      "zh-Hans": "把视频里的主持人搬进温暖阳光的京都咖啡店。",
    },
  },
  {
    id: "merge-reel",
    badge: { en: "Auto-Edit & Mix", "zh-Hant": "自動剪輯混音", "zh-Hans": "自动剪辑混音" },
    videoUrl: "/hero/tools/simple/center.mp4",
    posterUrl: "/hero/tools/simple/center.webp",
    title: {
      en: "Multi-Clip Merge & Voice Mix",
      "zh-Hant": "多段合併與自動配音",
      "zh-Hans": "多段合并与自动配音",
    },
    description: {
      en: "Stitch multiple clips together, add AI voiceover or music, and export a polished reel—no timeline needed.",
      "zh-Hant": "將多條短片自動順暢接駁，配上 AI 旁白或背景音樂並自動壓低背景音，全程零手動剪接。",
      "zh-Hans": "将多条短片自动流畅拼接，配上 AI 旁白或背景音乐并自动避让人声，全程零手动剪辑。",
    },
    steps: {
      en: ["Add Clips", "Auto Merge", "Voice & Music Mix"],
      "zh-Hant": ["放入多段片", "自動串接", "配音混音完成"],
      "zh-Hans": ["放入多段片", "自动拼接", "配音混音完成"],
    },
    aiPromptExample: {
      en: "Merge my 3 product clips together and add an upbeat voiceover.",
      "zh-Hant": "幫我將呢 3 段產品片接埋一齊，加一段輕快旁白。",
      "zh-Hans": "帮我把这 3 段产品片接在一起，加一段轻快旁白。",
    },
  },
  {
    id: "text-image-video",
    badge: { en: "Image → Video", "zh-Hant": "文生圖 → 影片", "zh-Hans": "文生图 → 视频" },
    videoUrl: "/hero/tools/simple/center.mp4",
    posterUrl: "/hero/tools/simple/left.webp",
    title: {
      en: "Text → Image → Video",
      "zh-Hant": "文字生圖再變短片",
      "zh-Hans": "文字生图再变短视频",
    },
    description: {
      en: "Generate a crisp 2K keyframe from a single sentence and bring it to life with smooth cinematic motion.",
      "zh-Hant": "一句話先生成 2K 高清海報級首幀，再自動加入電影運鏡動效變成短片。",
      "zh-Hans": "一句话先生成 2K 高清首帧，再自动加入电影运镜动效变成短视频。",
    },
    steps: {
      en: ["Describe Shot", "2K Keyframe", "Cinematic Motion"],
      "zh-Hant": ["輸入描述", "生成 2K 首幀", "動態短片完成"],
      "zh-Hans": ["输入描述", "生成 2K 首帧", "动态短视频完成"],
    },
    aiPromptExample: {
      en: "Generate a luxury perfume bottle on wet basalt and animate a slow dolly-in.",
      "zh-Hant": "先畫一枝放喺濕潤玄武岩上嘅香水，再做慢鏡頭推進短片。",
      "zh-Hans": "先画一瓶放在湿润玄武岩上的香水，再做慢镜头推进短视频。",
    },
  },
];
