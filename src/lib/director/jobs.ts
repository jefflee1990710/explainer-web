import type { ObjectId } from "mongodb";
import { refundCredits } from "@/lib/billing/credits";
import { skillsCollection, videosCollection } from "@/lib/collections";
import { keepProposalRegenerateClips } from "@/lib/director/phase-a-edit";
import { runPhaseA } from "@/lib/director/run-phase-a";
import { runPhaseBForClip } from "@/lib/director/run-phase-b";
import { videoStyle } from "@/lib/higgsfield/frame-prompts";
import { submitClipVideoJob, submitStillIfNeeded } from "@/lib/higgsfield/pipeline";
import { VIDEO_COST } from "@/lib/production-plan";

// Background jobs scheduled with next/server `after()` so the UI can poll
// instead of blocking on the LLM / video provider round-trips.

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

// Phase A: write the storyboard proposal for a freshly created or revised project.
export async function runPhaseAJob(
  projectId: ObjectId,
  revisionNote?: string,
  options?: { clipsOnly?: boolean },
) {
  const projects = await videosCollection();
  const project = await projects.findOne({ _id: projectId });
  if (!project) return;

  const skills = await skillsCollection();
  const skill = await skills.findOne({ _id: project.skillId });
  if (!skill) {
    await projects.updateOne(
      { _id: projectId },
      { $set: { status: "failed", error: "找不到風格", updatedAt: new Date() } },
    );
    return;
  }

  try {
    const phaseA = await runPhaseA({
      skill,
      style: videoStyle(project),
      source: project.source,
      aspectRatio: project.aspectRatio,
      durationPreset: project.durationPreset,
      language: project.language,
      characterImageUrl: project.characterImageUrl,
      cast: project.cast,
      currentDraft: project.phaseA,
      revisionNote,
      clipsOnly: options?.clipsOnly,
    });
    const nextPhaseA =
      options?.clipsOnly && project.phaseA
        ? keepProposalRegenerateClips(project.phaseA, phaseA)
        : phaseA;

    await projects.updateOne(
      { _id: projectId },
      {
        $set: {
          phaseA: nextPhaseA,
          status: "awaiting_approval",
          error: undefined,
          updatedAt: new Date(),
        },
      },
    );
  } catch (error) {
    await projects.updateOne(
      { _id: projectId },
      {
        $set: {
          status: "failed",
          error: errorMessage(error, "解說提案失敗"),
          updatedAt: new Date(),
        },
      },
    );
  }
}

// Character still after approval (free). Failure is recorded on the project
// and retried by the next frame request, never fatal.
export async function runStillJob(projectId: ObjectId) {
  const projects = await videosCollection();
  const project = await projects.findOne({ _id: projectId });
  if (!project) return;
  try {
    await submitStillIfNeeded(project);
  } catch (error) {
    await projects.updateOne(
      { _id: projectId },
      {
        $set: {
          stillError: errorMessage(error, "角色定裝圖送出失敗"),
          updatedAt: new Date(),
        },
      },
    );
  }
}

// One clip's video: write its Phase B prompt, then submit. The caller charged
// VIDEO_COST and marked the clip `queued`; any failure here refunds and marks it failed.
export async function runClipVideoJob(projectId: ObjectId, clipNumber: number) {
  const projects = await videosCollection();
  const project = await projects.findOne({ _id: projectId });
  if (!project?.phaseA) return;

  try {
    const skills = await skillsCollection();
    const skill = await skills.findOne({ _id: project.skillId });
    if (!skill) throw new Error("找不到風格");

    const prompt = await runPhaseBForClip({
      skill,
      style: videoStyle(project),
      phaseA: project.phaseA,
      clipNumber,
      language: project.language,
      characterImageUrl: project.characterImageUrl,
      cast: project.cast,
    });
    await projects.updateOne(
      { _id: projectId },
      {
        $set: {
          "clips.$[clip].prompt": prompt.prompt,
          "clips.$[clip].durationSeconds": prompt.durationSeconds,
          updatedAt: new Date(),
        },
      },
      { arrayFilters: [{ "clip.clipNumber": clipNumber }] },
    );

    const fresh = await projects.findOne({ _id: projectId });
    if (!fresh) return;
    await submitClipVideoJob(fresh, clipNumber, prompt);
  } catch (error) {
    await refundCredits(project.clerkUserId, VIDEO_COST);
    await projects.updateOne(
      { _id: projectId },
      {
        $set: {
          "clips.$[clip].status": "failed",
          "clips.$[clip].error": errorMessage(error, "產片失敗"),
          updatedAt: new Date(),
        },
      },
      { arrayFilters: [{ "clip.clipNumber": clipNumber }] },
    );
  }
}
