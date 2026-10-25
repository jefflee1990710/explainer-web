export const POSE_EDIT_ASPECTS = ["1:1", "3:4", "9:16"] as const;
export type PoseEditAspect = (typeof POSE_EDIT_ASPECTS)[number];

const RATIO: Record<PoseEditAspect, number> = { "1:1": 1, "3:4": 3 / 4, "9:16": 9 / 16 };

export function poseEditAspect(width?: number, height?: number): PoseEditAspect {
  if (!width || !height || width <= 0 || height <= 0) return "3:4";
  const ratio = width / height;
  return [...POSE_EDIT_ASPECTS].sort((a, b) => {
    const distance = Math.abs(ratio - RATIO[a]) - Math.abs(ratio - RATIO[b]);
    return distance !== 0 ? distance : RATIO[a] - RATIO[b];
  })[0];
}
