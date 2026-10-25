import { ObjectId } from "mongodb";
import { poseEditsCollection } from "@/dao";
import type { PoseEdit } from "@/model/pose-edit";
import { apiError, apiJson, withApiUser } from "@/service/api/respond";
import { toPoseEditDto } from "@/service/pose-edit/dto";
import { POSE_EDIT_ERRORS } from "@/service/pose-edit/errors";

type Params = { id: string };

// One edit owned by the caller. A missing or someone else's id is the same 404.
export const GET = withApiUser<Params>(async ({ auth, params }) => {
  if (!ObjectId.isValid(params.id)) return apiError(POSE_EDIT_ERRORS.missing, 404);
  const edits = await poseEditsCollection();
  const edit = await edits.findOne({
    _id: new ObjectId(params.id),
    clerkUserId: auth.user.clerkUserId,
  });
  if (!edit) return apiError(POSE_EDIT_ERRORS.missing, 404);
  return apiJson(toPoseEditDto(edit as PoseEdit));
});
