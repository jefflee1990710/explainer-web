import type { ObjectId } from "mongodb";
import { characterLockFromCast } from "@/service/character/cast-prompt";
import { skillsCollection, videosCollection } from "@/dao";
import { asRunSkill } from "@/service/director/behavior-slug";
import { keepProposalRegenerateClips } from "@/service/director/phase-a-edit";
import { runPhaseA } from "@/service/director/run-phase-a";
import { videoStyle } from "@/service/higgsfield/frame-prompts";
import { submitStillIfNeeded } from "@/service/higgsfield/pipeline";
import { persistBuffer } from "@/service/higgsfield/persist";
import { concatMp4Urls } from "@/service/reel/concat";
import { clipReelFingerprint, clipUrlsInOrder } from "@/service/reel/fingerprint";
import { queueReelIfReady, scheduleReel } from "@/service/reel/enqueue";
import {
  MAX_REEL_ATTEMPTS,
  REEL_TIMEOUT_MESSAGE,
  isRetryableReelError,
  reelTimeoutMs,
  withTimeout,
} from "@/service/reel/timeout";

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
  const found = await skills.findOne({ _id: project.skillId });
  if (!found) {
    await projects.updateOne(
      { _id: projectId },
      { $set: { status: "failed", error: "找不到風格", updatedAt: new Date() } },
    );
    return;
  }
  const skill = asRunSkill(found);

  try {
    const phaseA = await runPhaseA({
      skill,
      style: videoStyle(project),
      source: project.source,
      spokenScript: project.spokenScript,
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
      referenceImages: project.referenceImages,
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
// in_progress → completed, retried, or failed. Writes match this attempt so a
// late result cannot clobber a newer retry.
export async function runReelJob(projectId: ObjectId, fingerprint: string) {
  const projects = await videosCollection();
  const queued = await projects.findOne({
    _id: projectId,
    reelFingerprint: fingerprint,
    reelStatus: "queued",
  });
  if (!queued) return;
  // Older rows have no counter; this attempt is the first.
  const attempt = queued.reelAttempts ?? 1;
  const project = await projects.findOneAndUpdate(
    { _id: projectId, reelFingerprint: fingerprint, reelStatus: "queued" },
    { $set: { reelStatus: "in_progress", reelAttempts: attempt, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!project) return;
  const attemptMatch = {
    _id: projectId,
    reelFingerprint: fingerprint,
    reelStatus: "in_progress" as const,
    reelAttempts: attempt,
  };

  try {
    const urls = clipUrlsInOrder(project);
    const deadline = Date.now() + reelTimeoutMs(urls.length);
    const reelUrl =
      urls.length === 1
        ? urls[0]
        : await withTimeout(
            persistBuffer(
              await concatMp4Urls(urls, deadline - Date.now()),
              `explainer/${projectId.toHexString()}/reel/${fingerprint}.mp4`,
              "video/mp4",
            ),
            Math.max(1, deadline - Date.now()),
            REEL_TIMEOUT_MESSAGE,
          );

    const latest = await projects.findOne({ _id: projectId });
    if (!latest || clipReelFingerprint(latest) !== fingerprint) {
      await projects.updateOne(attemptMatch, {
        $set: {
          reelStatus: "failed",
          reelError: "片段已更新，改合成新的成片",
          updatedAt: new Date(),
        },
      });
      await queueReelIfReady(projectId);
      return;
    }

    await projects.updateOne(attemptMatch, {
      $set: {
        reelUrl,
        reelStatus: "completed",
        reelFingerprint: fingerprint,
        updatedAt: new Date(),
      },
      $unset: { reelError: "" },
    });
  } catch (error) {
    const retry = isRetryableReelError(error) && attempt < MAX_REEL_ATTEMPTS;
    if (retry) {
      const requeued = await projects.updateOne(attemptMatch, {
        $set: { reelStatus: "queued", reelAttempts: attempt + 1, updatedAt: new Date() },
        $unset: { reelError: "" },
      });
      if (requeued.modifiedCount === 1) scheduleReel(projectId, fingerprint);
      return;
    }
    await projects.updateOne(attemptMatch, {
      $set: {
        reelStatus: "failed",
        reelError: errorMessage(error, "合成成片失敗"),
        updatedAt: new Date(),
      },
    });
  }
}
