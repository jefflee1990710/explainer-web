import { CARTOON_EXPLAINER_SKILL_SLUG } from "@/service/director/dual-beat";
import {
  DIALOGUE_QA_SKILL_SLUG,
  LISTICLE_SKILL_SLUG,
  STORY_SHORT_SKILL_SLUG,
} from "@/service/director/skill-rules";

export type SkillGuide = {
  voice: string;
  structure: string;
  picture: string;
  frames: string;
};

export const SKILL_GUIDE_FIELDS = [
  { key: "voice", label: "聲音" },
  { key: "structure", label: "結構" },
  { key: "picture", label: "畫面" },
  { key: "frames", label: "畫格" },
] as const;

const PRODUCT_DEMO_SKILL_SLUG = "product-demo-director";
const TUTORIAL_SKILL_SLUG = "tutorial-director";

// Create-form copy: how each director treats voice, story, look, and stills.
const GUIDES: Record<string, SkillGuide> = {
  [CARTOON_EXPLAINER_SKILL_SLUG]: {
    voice: "旁白講 VO（你選的男／女聲）",
    structure: "鉤子 → 拆解概念 → 延後亮點",
    picture: "白板塗鴉、圖示變身、手寫標籤",
    frames: "每段兩拍，起始／結尾各一句旁白",
  },
  [STORY_SHORT_SKILL_SLUG]: {
    voice: "角色對白，沒有旁白；可整段安靜",
    structure: "想要 → 受阻 → 轉折 → 收束",
    picture: "跟所選視覺風格；情緒靠姿勢，少用字幕",
    frames: "每段一條對白，或標成靜音",
  },
  [PRODUCT_DEMO_SKILL_SLUG]: {
    voice: "旁白／主持人，用「你」講效益",
    structure: "痛點 → 開箱 → 功能示範 → 成果",
    picture: "產品外觀全程鎖定；手與產品為主",
    frames: "每段一個動作，對一個可見結果",
  },
  [DIALOGUE_QA_SKILL_SLUG]: {
    voice: "兩個角色對白（問／答），沒有旁白",
    structure: "提問推進好奇，回答交付重點",
    picture: "左右固定站位；中間放道具或圖解",
    frames: "每段一問或一答（短則問答同段）",
  },
  [LISTICLE_SKILL_SLUG]: {
    voice: "主持人旁白，每項句型對齊",
    structure: "開場講 N 項 → 一項一段 → 最好的放最後",
    picture: "每張都要有編號清單，凸顯當項",
    frames: "每段一項；數字先彈，再出圖",
  },
  [TUTORIAL_SKILL_SLUG]: {
    voice: "旁白用祈使句（剪、點、加）",
    structure: "先亮成果 → 一步一段 → 回到完成品",
    picture: "同一工作台；步驟數字當道具",
    frames: "每段一個動作、一個狀態變化",
  },
};

export function skillGuideFor(slug: string): SkillGuide | undefined {
  return GUIDES[slug];
}
