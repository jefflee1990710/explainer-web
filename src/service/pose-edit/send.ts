import type { ObjectId } from "mongodb";
import { poseEditsCollection } from "@/dao";
import type { GenerationJob } from "@/model/generation-job";
import { lifePoseReferenceUrl } from "@/service/character/life-pose-ref";
import { NANO_BANANA_PRO_IMAGE_MODEL } from "@/service/generation/image-backend";
import { toSent, type Sent } from "@/service/generation/sent";
import { PermanentJobError } from "@/service/generation/task-policy";
import { insertPendingJob, kickJob } from "@/service/generation/task-store";
import { submitGoogleStudioImage } from "@/service/google/studio-image";
import { POSE_EDIT_ERRORS } from "@/service/pose-edit/errors";
import { poseEditSubmitInput } from "@/service/pose-edit/submit-input";

// Google Studio still. A missing edit cannot be fixed by retrying the provider.
export async function sendPoseEdit(job: GenerationJob): Promise<Sent> {
  if (!job.poseEditId) throw new PermanentJobError(POSE_EDIT_ERRORS.missing);
  const edits = await poseEditsCollection();
  const edit = await edits.findOne({ _id: job.poseEditId });
  if (!edit) throw new PermanentJobError(POSE_EDIT_ERRORS.missing);
  const poseReferenceUrl = edit.poseId ? await lifePoseReferenceUrl(edit.poseId) : undefined;
  const submitted = await submitGoogleStudioImage({
    ...poseEditSubmitInput(edit, poseReferenceUrl),
    resolution: "1k",
  });
  return toSent(NANO_BANANA_PRO_IMAGE_MODEL, submitted);
}

// Queue one pose edit on the shared still generator, then try to run it now.
export async function enqueuePoseEdit(editId: ObjectId) {
  const jobId = await insertPendingJob({
    poseEditId: editId,
    clipIndex: -1,
    kind: "poseEdit",
    model: NANO_BANANA_PRO_IMAGE_MODEL,
  });
  kickJob(jobId);
  return jobId;
}
