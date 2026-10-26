import type { ObjectId } from "mongodb";
import { poseEditsCollection } from "@/dao";
import type { GenerationJob } from "@/model/generation-job";
import { lifePoseReferenceUrl } from "@/service/character/life-pose-ref";
import { SEEDREAM_5_PRO_IMAGE_MODEL } from "@/service/generation/image-backend";
import { toSent, type Sent } from "@/service/generation/sent";
import { PermanentJobError } from "@/service/generation/task-policy";
import { insertPendingJob, kickJob } from "@/service/generation/task-store";
import { submitOpenRouterImage } from "@/service/openrouter/generate";
import { POSE_EDIT_ERRORS } from "@/service/pose-edit/errors";
import { poseEditSubmitInput } from "@/service/pose-edit/submit-input";

// Seedream 5.0 Pro on OpenRouter. A missing edit cannot be fixed by retrying the provider.
export async function sendPoseEdit(job: GenerationJob): Promise<Sent> {
  if (!job.poseEditId) throw new PermanentJobError(POSE_EDIT_ERRORS.missing);
  const edits = await poseEditsCollection();
  const edit = await edits.findOne({ _id: job.poseEditId });
  if (!edit) throw new PermanentJobError(POSE_EDIT_ERRORS.missing);
  const poseReferenceUrl = edit.poseId ? await lifePoseReferenceUrl(edit.poseId) : undefined;
  // Free welcome-tier pose edits render at 1k; paid subscribers / pack buyers get 2k.
  const resolution = edit.freeTier ? "1k" : "2k";
  const submitted = await submitOpenRouterImage({
    model: SEEDREAM_5_PRO_IMAGE_MODEL,
    ...poseEditSubmitInput(edit, poseReferenceUrl),
    resolution,
  });
  return toSent(SEEDREAM_5_PRO_IMAGE_MODEL, submitted);
}

// Queue one pose edit on the shared still generator, then try to run it now.
export async function enqueuePoseEdit(editId: ObjectId) {
  const jobId = await insertPendingJob({
    poseEditId: editId,
    clipIndex: -1,
    kind: "poseEdit",
    model: SEEDREAM_5_PRO_IMAGE_MODEL,
  });
  kickJob(jobId);
  return jobId;
}
