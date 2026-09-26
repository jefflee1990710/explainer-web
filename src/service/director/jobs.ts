import type { ObjectId } from "mongodb";
import { characterLockFromCast } from "@/service/character/cast-prompt";
import { refundCredits } from "@/service/billing/credits";
import {
  generationJobsCollection,
  skillsCollection,
  videosCollection,
} from "@/dao";
import { keepProposalRegenerateClips } from "@/service/director/phase-a-edit";
import { runPhaseA } from "@/service/director/run-phase-a";
import { runPhaseBForClip } from "@/service/director/run-phase-b";
import { videoStyle } from "@/service/higgsfield/frame-prompts";
import { hasJobSince } from "@/service/higgsfield/job-attempts";
import { submitClipVideoJob, submitStillIfNeeded } from "@/service/higgsfield/pipeline";
import { persistBuffer } from "@/service/higgsfield/persist";
import { VIDEO_COST } from "@/service/production-plan";
import { concatMp4Urls } from "@/service/reel/concat";
import { clipReelFingerprint, clipUrlsInOrder } from "@/service/reel/fingerprint";
import type { Project } from "@/model/project";

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
      sceneTextEnabled: project.sceneTextEnabled,
      sceneTextLanguage: project.sceneTextLanguage,
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

// Hand the credit back and mark the clip failed. Used by every exit that leaves
// the clip with no job to own its outcome, so a charged clip is never stranded
// `queued` with nothing to move it.
async function compensateClipVideo(
  project: Project,
  clipNumber: number,
  message: string,
) {
  await refundCredits(project.clerkUserId, VIDEO_COST);
  const projects = await videosCollection();
  await projects.updateOne(
    { _id: project._id },
    {
      $set: {
        "clips.$[clip].status": "failed",
        "clips.$[clip].error": message,
        updatedAt: new Date(),
      },
    },
    { arrayFilters: [{ "clip.clipNumber": clipNumber }] },
  );
}

// One clip's video: write its Phase B prompt, then submit. The caller charged
// VIDEO_COST and marked the clip `queued`; any failure here refunds and marks it failed.
export async function runClipVideoJob(projectId: ObjectId, clipNumber: number) {
  // Jobs older than this are leftovers from a previous attempt.
  const attemptStartedAt = new Date();
  const projects = await videosCollection();
  const project = await projects.findOne({ _id: projectId });
  if (!project) {
    // No project, no owner to refund; nothing else can be done here.
    console.error("[clip-video] project vanished before Phase B", { projectId, clipNumber });
    return;
  }
  if (!project.phaseA) {
    await compensateClipVideo(project, clipNumber, "找不到分鏡");
    return;
  }

  try {
    // Drop the clip's previous video job before Phase B runs: otherwise a stale
    // job stays the newest one and wins reconciliation while we write the
    // prompt, overwriting the `queued` clip and, on failure, the `failed`
    // marker below. Inside the try so a failed delete still refunds.
    const jobs = await generationJobsCollection();
    await jobs.deleteMany({ projectId, kind: "video", clipIndex: clipNumber - 1 });

    const skills = await skillsCollection();
    const skill = await skills.findOne({ _id: project.skillId });
    if (!skill) throw new Error("找不到風格");

    const prompt = await runPhaseBForClip({
      skill,
      style: videoStyle(project),
      phaseA: project.phaseA,
      clipNumber,
      language: project.language,
      voiceGender: project.voiceGender,
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
    if (!fresh) throw new Error("專案已不存在");
    await submitClipVideoJob(fresh, clipNumber, prompt);
  } catch (error) {
    // The submit inserts the job before syncing, so a throw can arrive with a
    // live job already placed. That job owns the outcome and refunds itself on
    // failure; refunding here too would hand the credit back twice.
    const jobs = await generationJobsCollection();
    const videoJobs = await jobs
      .find({ projectId, kind: "video", clipIndex: clipNumber - 1 })
      .toArray();
    if (hasJobSince(videoJobs, attemptStartedAt)) {
      console.error("[clip-video] failed after the job was submitted", {
        projectId,
        clipNumber,
        error,
      });
      return;
    }
    await compensateClipVideo(project, clipNumber, errorMessage(error, "產片失敗"));
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
