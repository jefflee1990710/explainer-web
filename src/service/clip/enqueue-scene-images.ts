import type { ObjectId } from "mongodb";
import { usersCollection, videosCollection } from "@/dao";
import {
  assertCanSpendCredits,
  consumeCredits,
  refundCredits,
} from "@/service/billing/credits";
import { enqueueClipFrameJobs } from "@/service/higgsfield/pipeline";
import { planGenerateAllScenes } from "@/service/production-plan";

// After a new storyboard lands, queue every scene image. No-op until the
// character still exists, and no-op once any frame has already been submitted.
export async function enqueueSceneImagesForNewVideo(projectId: ObjectId) {
  const projects = await videosCollection();
  const project = await projects.findOne({ _id: projectId });
  if (!project?.phaseA) return;
  const hasCast = (project.cast?.length ?? 0) > 0;
  if (!hasCast && !project.characterStillUrl) return;
  const started = (project.frames || []).some(
    (frame) =>
      frame.submittedAt ||
      frame.status === "queued" ||
      frame.status === "in_progress" ||
      frame.status === "completed",
  );
  if (started) return;

  const plan = planGenerateAllScenes(project);
  if (plan.frames.length === 0 || plan.cost === 0) return;

  const users = await usersCollection();
  const user = await users.findOne({ clerkUserId: project.clerkUserId });
  if (!user) return;
  await assertCanSpendCredits(user, plan.cost);
  const spendKey = await consumeCredits(project.clerkUserId, plan.cost);
  try {
    await enqueueClipFrameJobs(project, plan.frames);
  } catch (error) {
    await refundCredits(project.clerkUserId, plan.cost, spendKey);
    throw error;
  }
}
