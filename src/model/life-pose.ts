// Client-safe pose library types and helpers. Data lives in life-poses.data.ts (generated).
import { LIFE_POSES } from "@/model/life-poses.data";

export const LIFE_POSE_GROUPS = ["stand-full", "walk-full", "stand-half", "sit"] as const;
export type LifePoseGroup = (typeof LIFE_POSE_GROUPS)[number];

export const LIFE_POSE_HANDS = [
  "face",
  "hair",
  "hip",
  "arms-up",
  "peace",
  "phone",
  "drink",
  "bag",
  "pocket",
  "wave",
] as const;

// Crop the skeleton was taken from: whole body, knee-up or waist-up.
export type LifePoseFraming = "full" | "knee" | "half";

export type LifePose = {
  id: string;
  group: LifePoseGroup;
  framing: LifePoseFraming;
  hands: string[];
  // Number of creator posts in the cluster; used to sort the grid.
  popularity: number;
  // English body-pose sentence sent alongside the skeleton image.
  promptText: string;
};

export { LIFE_POSES };

const BY_ID = new Map(LIFE_POSES.map((pose) => [pose.id, pose]));

export function lifePoseById(id: string | undefined | null): LifePose | null {
  if (!id) return null;
  return BY_ID.get(id) ?? null;
}

// Grid list for one tab, optionally narrowed to a hand action.
export function filterLifePoses(group: LifePoseGroup, hand?: string) {
  return LIFE_POSES.filter((pose) => pose.group === group && (!hand || pose.hands.includes(hand)));
}

// Stick-figure skeleton sent to the generation model as a pose reference.
export function lifePoseImagePath(id: string) {
  return `/life-poses/${id}.png`;
}

// Gemini-generated Scro pose preview still for the picker card.
export function lifePosePreviewSrc(id: string) {
  return `/life-pose-previews/${id}.webp?v=1`;
}
