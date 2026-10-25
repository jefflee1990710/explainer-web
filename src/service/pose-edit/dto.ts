import type { PoseEdit } from "@/model/pose-edit";
import type { PoseEditWardrobe } from "@/service/pose-edit/selection";

export type PoseEditDto = {
  id: string;
  status: PoseEdit["status"];
  sourceUrl: string;
  resultUrl?: string;
  poseId?: string;
  wardrobe: PoseEditWardrobe;
  error?: string;
  createdAt: string;
};

export function toPoseEditDto(edit: PoseEdit): PoseEditDto {
  return {
    id: edit._id.toHexString(),
    status: edit.status,
    sourceUrl: edit.sourceUrl,
    ...(edit.resultUrl ? { resultUrl: edit.resultUrl } : {}),
    ...(edit.poseId ? { poseId: edit.poseId } : {}),
    wardrobe: edit.wardrobe,
    ...(edit.error ? { error: edit.error } : {}),
    createdAt: edit.createdAt.toISOString(),
  };
}
