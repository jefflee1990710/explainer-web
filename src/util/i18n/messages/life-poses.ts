// Life pose library labels. Pose names are generated into life-poses.names.ts.
import { LIFE_POSE_NAMES_EN, LIFE_POSE_NAMES_ZH } from "@/util/i18n/messages/life-poses.names";

export type LifePoseLabels = {
  title: string;
  hint: string;
  change: string;
  clear: string;
  allHands: string;
  selectedHint: string;
  groups: Record<string, string>;
  hands: Record<string, string>;
  framing: Record<string, string>;
  names: Record<string, string>;
};

export const LIFE_POSES_EN: LifePoseLabels = {
  title: "Pose",
  hint: "Pick a body pose from real creator posts. The character copies it.",
  change: "Change",
  clear: "Clear",
  allHands: "All",
  selectedHint: "The character copies this body pose.",
  groups: {
    "stand-full": "Standing · full body",
    "stand-half": "Standing · upper body",
    sit: "Sitting & crouching",
  },
  hands: {
    face: "Hand by face",
    hair: "Touching hair",
    hip: "Hand on hip",
    "arms-up": "Arms up",
    peace: "Peace sign",
    phone: "Phone",
    drink: "Drink",
    bag: "Bag",
    pocket: "Pocket",
    wave: "Wave",
  },
  framing: { full: "Full", knee: "Knee-up", half: "Waist-up" },
  names: LIFE_POSE_NAMES_EN,
};

export const LIFE_POSES_ZH: LifePoseLabels = {
  title: "姿勢",
  hint: "從真實創作者貼文整理出的身體姿勢，角色會照著擺。",
  change: "更換",
  clear: "清除",
  allHands: "全部",
  selectedHint: "角色會照這個姿勢擺。",
  groups: {
    "stand-full": "站姿・全身",
    "stand-half": "站姿・半身",
    sit: "坐姿與蹲姿",
  },
  hands: {
    face: "手放臉旁",
    hair: "撥頭髮",
    hip: "叉腰",
    "arms-up": "舉手",
    peace: "比 V",
    phone: "拿手機",
    drink: "拿飲品",
    bag: "拿包",
    pocket: "插袋",
    wave: "揮手",
  },
  framing: { full: "全身", knee: "膝上", half: "半身" },
  names: LIFE_POSE_NAMES_ZH,
};
