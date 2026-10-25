import { lifePoseById } from "@/model/life-pose";
import { isCharacterLookId, isFullBodyTop } from "@/service/character/character-look";
import { POSE_EDIT_ERRORS } from "@/service/pose-edit/errors";

export const POSE_EDIT_PARTS = ["top", "pants", "shoes", "accessory"] as const;
export type PoseEditPart = (typeof POSE_EDIT_PARTS)[number];
export type PoseEditWardrobe = Partial<Record<PoseEditPart, string>>;

export function parsePoseEditSelection(input: {
  poseId?: string;
  top?: string;
  pants?: string;
  shoes?: string;
  accessory?: string;
}): { ok: true; poseId?: string; wardrobe: PoseEditWardrobe } | { ok: false; error: string } {
  const poseId = input.poseId?.trim() || undefined;
  if (poseId && !lifePoseById(poseId)) return { ok: false, error: POSE_EDIT_ERRORS.pose };
  const wardrobe: PoseEditWardrobe = {};
  for (const part of POSE_EDIT_PARTS) {
    const id = input[part]?.trim();
    if (!id) continue;
    if (id === "none" || /^cw_[a-f0-9]{24}$/i.test(id) || !isCharacterLookId(part, id)) {
      return { ok: false, error: POSE_EDIT_ERRORS.outfit };
    }
    wardrobe[part] = id;
  }
  if (isFullBodyTop(wardrobe.top)) delete wardrobe.pants;
  if (!poseId && Object.keys(wardrobe).length === 0) {
    return { ok: false, error: POSE_EDIT_ERRORS.empty };
  }
  if (poseId) {
    return { ok: true, poseId, wardrobe };
  }
  return { ok: true, wardrobe };
}
