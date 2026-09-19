import type { ObjectId } from "mongodb";
import { refundCredits } from "@/lib/billing/credits";
import { skillsCollection, videosCollection } from "@/lib/collections";
import { keepProposalRegenerateClips } from "@/lib/director/phase-a-edit";
import { runPhaseA } from "@/lib/director/run-phase-a";
import { runPhaseB } from "@/lib/director/run-phase-b";
import {
  startFrameGeneration,
  startProjectGeneration,
} from "@/lib/higgsfield/pipeline";
import { videoStyle } from "@/lib/higgsfield/frame-prompts";

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
          creditCost: nextPhaseA.clipCount,
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

// Storyboard frames stage: submit the character still, then every start/end
// frame in parallel. Frame credits were already consumed by the caller.
export async function runFrameGenerationJob(projectId: ObjectId) {
  const projects = await videosCollection();
  const project = await projects.findOne({ _id: projectId });
  if (!project?.phaseA) return;

  try {
    await startFrameGeneration(project);
  } catch (error) {
    if (project.framesCharged && project.framesCreditCost) {
      await refundCredits(project.clerkUserId, project.framesCreditCost);
    }
    await projects.updateOne(
      { _id: projectId },
      {
        $set: {
          status: "failed",
          framesCharged: false,
          error: errorMessage(error, "分鏡圖產生失敗"),
          updatedAt: new Date(),
        },
      },
    );
  }
}

// Phase B + submit video jobs. Credits were already consumed by the caller.
export async function runPhaseBAndGenerateJob(projectId: ObjectId) {
  const projects = await videosCollection();
  const project = await projects.findOne({ _id: projectId });
  if (!project?.phaseA) return;

  const skills = await skillsCollection();
  const skill = await skills.findOne({ _id: project.skillId });

  try {
    if (!skill) throw new Error("找不到風格");

    const phaseB = await runPhaseB({
      skill,
      style: videoStyle(project),
      phaseA: project.phaseA,
      language: project.language,
      characterImageUrl: project.characterImageUrl,
      cast: project.cast,
    });

    await projects.updateOne(
      { _id: projectId },
      { $set: { phaseB, updatedAt: new Date() } },
    );

    const ready = await projects.findOne({ _id: projectId });
    if (!ready) return;
    await startProjectGeneration(ready);
  } catch (error) {
    // Give the credits back so a provider outage never charges the user.
    const creditCost = project.creditCost ?? 0;
    if (project.creditsCharged && creditCost > 0) {
      await refundCredits(project.clerkUserId, creditCost);
    }
    await projects.updateOne(
      { _id: projectId },
      {
        $set: {
          status: "failed",
          creditsCharged: false,
          error: errorMessage(error, "產片失敗"),
          updatedAt: new Date(),
        },
      },
    );
  }
}
