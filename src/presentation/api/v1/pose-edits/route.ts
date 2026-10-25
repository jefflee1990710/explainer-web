import { poseEditsCollection } from "@/dao";
import type { PoseEdit } from "@/model/pose-edit";
import { apiError, apiJson, withApiUser } from "@/service/api/respond";
import { createPoseEdit } from "@/service/pose-edit/create";
import { toPoseEditDto } from "@/service/pose-edit/dto";
import { POSE_EDIT_ERRORS } from "@/service/pose-edit/errors";

function fieldText(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value : undefined;
}

// This user's newest pose edits, capped at 30.
export const GET = withApiUser(async ({ auth }) => {
  const edits = await poseEditsCollection();
  const docs = await edits
    .find({ clerkUserId: auth.user.clerkUserId })
    .sort({ createdAt: -1 })
    .limit(30)
    .toArray();
  return apiJson(docs.map((doc) => toPoseEditDto(doc as PoseEdit)));
});

// Multipart photo plus optional pose and garment ids. Success is 201, including a failed queue.
export const POST = withApiUser(async ({ auth, request }) => {
  const type = request.headers.get("content-type") || "";
  if (!type.includes("multipart/form-data")) return apiError("請用 multipart/form-data 上傳");
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return apiError(POSE_EDIT_ERRORS.file);
  const result = await createPoseEdit({
    user: auth.user,
    bytes: new Uint8Array(await file.arrayBuffer()),
    fields: {
      poseId: fieldText(form, "poseId"),
      top: fieldText(form, "top"),
      pants: fieldText(form, "pants"),
      shoes: fieldText(form, "shoes"),
      accessory: fieldText(form, "accessory"),
    },
  });
  if (!result.ok) return apiError(result.error, result.status);
  return apiJson(result.dto, 201);
});
