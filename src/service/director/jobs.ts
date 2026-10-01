import type { ObjectId } from "mongodb";
import { characterLockFromCast } from "@/service/character/cast-prompt";
import { skillsCollection, videosCollection } from "@/dao";
import { keepProposalRegenerateClips } from "@/service/director/phase-a-edit";
import { runPhaseA } from "@/service/director/run-phase-a";
import { videoStyle } from "@/service/higgsfield/frame-prompts";
import { submitStillIfNeeded } from "@/service/higgsfield/pipeline";
import { persistBuffer } from "@/service/higgsfield/persist";
import { concatMp4Urls } from "@/service/reel/concat";
import { clipReelFingerprint, clipUrlsInOrder } from "@/service/reel/fingerprint";

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
      voiceGender: project.voiceGender,
      speechPace: project.speechPace,
      sceneTextEnabled: project.sceneTextEnabled,
      sceneTextLanguage: project.sceneTextLanguage,
      characterImageUrl: project.characterImageUrl,
      cast: project.cast,
      logoUrl: project.logoUrl,
      currentDraft: project.phaseA,
      revisionNote,
      clipsOnly: options?.clipsOnly,
    });
    const nextPhaseA =
      options?.clipsOnly && project.phaseA
        ? keepProposalRegenerateClips(project.phaseA, phaseA)
        : phaseA;
    // Always pin characterLock to the cast blueprint rule, including clips-only
    // regenerations that would otherwise keep a previously invented outfit.
    if (project.cast && project.cast.length > 0) {
      nextPhaseA.characterLock = characterLockFromCast(project.cast);
    } else if (project.characterImageUrl) {
      nextPhaseA.characterLock =
        "角色外貌一律以附加參考圖為準；禁止另行描述或改動髮型、臉型、服裝或配件。";
    }

    await projects.updateOne(
      { _id: projectId },
      {
        // `$set: { error: undefined }` would store null; clear the field instead.
        $set: {
          phaseA: nextPhaseA,
          // Skip the old 核准分鏡 gate — frames and videos start from 製作.
          status: "production",
          updatedAt: new Date(),
        },
        $unset: { error: "" },
      },
    );
    // Same as the old approve action: lock the character still before frames.
    await runStillJob(projectId);
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

// Concat every ready clip into one reel. Caller queued the row; we mark
// in_progress → completed (or failed). A fingerprint mismatch means clips
// changed mid-job, so we drop the result instead of overwriting a newer reel.
export async function runReelJob(projectId: ObjectId, fingerprint: string) {
  const projects = await videosCollection();
  const claimed = await projects.findOneAndUpdate(
    { _id: projectId, reelFingerprint: fingerprint, reelStatus: "queued" },
    { $set: { reelStatus: "in_progress", updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  const project = claimed;
  if (!project) return;

  try {
    const urls = clipUrlsInOrder(project);
    const reelUrl =
      urls.length === 1
        ? urls[0]
        : await persistBuffer(
            await concatMp4Urls(urls),
            `explainer/${projectId.toHexString()}/reel/${fingerprint}.mp4`,
            "video/mp4",
          );

    const latest = await projects.findOne({ _id: projectId });
    if (!latest || clipReelFingerprint(latest) !== fingerprint) return;

    await projects.updateOne(
      { _id: projectId, reelFingerprint: fingerprint },
      {
        $set: {
          reelUrl,
          reelStatus: "completed",
          reelFingerprint: fingerprint,
          updatedAt: new Date(),
        },
        $unset: { reelError: "" },
      },
    );
  } catch (error) {
    await projects.updateOne(
      { _id: projectId, reelFingerprint: fingerprint },
      {
        $set: {
          reelStatus: "failed",
          reelError: errorMessage(error, "合成成片失敗"),
          updatedAt: new Date(),
        },
      },
    );
  }
}
