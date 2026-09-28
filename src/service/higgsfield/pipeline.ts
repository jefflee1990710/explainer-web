import { ObjectId } from "mongodb";
import {
  frameLockReferenceUrls,
  sceneImageReferenceUrls,
} from "@/service/character/cast-prompt";
import { syncCharacterJob } from "@/service/character/sync";
import {
  generationJobsCollection,
  skillsCollection,
  videosCollection,
} from "@/dao";
import { refundCredits } from "@/service/billing/credits";
import { flattenToCanvas } from "@/service/higgsfield/flatten";
import { sceneTextNegativePrompt, resolveSceneText } from "@/service/director/scene-text";
import { imageModelForSubmit, resolveImageRoute } from "@/service/generation/image-backend";
import { buildFramePrompt, videoStyle } from "@/service/higgsfield/frame-prompts";
import {
  orphanQueuedClips,
  orphanQueuedFrames,
  positionsToFail,
  unsubmittedPositions,
} from "@/service/higgsfield/job-attempts";
import {
  fetchHiggsfieldStatus,
  mediaUrlFromResponse,
  submitClipVideo,
  submitImage,
} from "@/service/higgsfield/generate";
import { jobNeedsRefresh, settleProviderStatus, userFacingJobError } from "@/service/higgsfield/job-status";
import { persistMedia } from "@/service/higgsfield/persist";
import {
  MINIMAX_H3_VIDEO_MODEL,
  assertClipKeyframes,
  clipKeyframeUrls,
  planFrameSubmissions,
} from "@/service/higgsfield/clip-keyframes";
import {
  nextProjectStatus,
  reconcileClips,
  reconcileFrames,
} from "@/service/higgsfield/reconcile";
import { scheduleGenerationFinishedEmail } from "@/service/notify/generation-email";
import { FRAME_COST, STUCK_CLAIM_MS, VIDEO_COST } from "@/service/production-plan";
import { toSent, type Sent } from "@/service/generation/sent";
import { insertPendingJob, kickJob } from "@/service/generation/task-store";
import type { GenerationJob, GenerationStatus } from "@/model/generation-job";
import type {
  FramePosition,
  FrameRevision,
  PhaseBPrompt,
  Project,
} from "@/model/project";
import type { Skill } from "@/model/skill";

// ---------- prompts ----------

function stillPrompt(project: Project) {
  const style = videoStyle(project);
  const lock = project.phaseA?.characterLock || "default explainer everyman";
  return [
    `Character visual lock still for a ${style.name} short video.`,
    `Canvas: ${style.canvas}. Look: ${style.look}. Never: ${style.negatives}.`,
    `Front three-quarter standing pose, identical character: ${lock}.`,
    `Aspect ratio ${project.aspectRatio}.`,
  ].join(" ");
}

async function loadSkill(project: Project): Promise<Skill> {
  const skills = await skillsCollection();
  const skill = await skills.findOne({ _id: project.skillId });
  if (!skill) throw new Error("找不到風格");
  return skill;
}

// ---------- character still (free) ----------

// Send the character lock still to the provider (free). No job write.
export async function sendStill(project: Project): Promise<Sent> {
  const skill = await loadSkill(project);
  const model = imageModelForSubmit(resolveImageRoute(), Boolean(project.characterImageUrl));
  const submitted = await submitImage({
    model,
    prompt: stillPrompt(project),
    aspectRatio: project.aspectRatio,
    quality: skill.higgsfieldDefaults.imageQuality || "medium",
    resolution: skill.higgsfieldDefaults.imageResolution || "1k",
    referenceImageUrls: [project.characterImageUrl],
  });
  return toSent(model, submitted);
}

// Projects without a cast lock the character with a generated still. Submit it
// once; failed attempts are replaced. No-op when a cast or a still already exists.
export async function submitStillIfNeeded(project: Project) {
  if (project.cast && project.cast.length > 0) return;
  if (project.characterStillUrl) return;
  const jobs = await generationJobsCollection();
  const projects = await videosCollection();

  await jobs.deleteMany({
    projectId: project._id,
    kind: "still",
    status: { $in: ["failed", "nsfw"] },
  });
  const existing = await jobs.findOne({ projectId: project._id, kind: "still" });
  if (existing) return;

  const id = await insertPendingJob({ projectId: project._id, clipIndex: -1, kind: "still" });
  kickJob(id);
  await projects.updateOne(
    { _id: project._id },
    { $unset: { stillError: "" }, $set: { updatedAt: new Date() } },
  );
}

// Frames need the character lock. Returns a user-facing reason to wait (and
// kicks the still off) or null when frames may be submitted now.
export async function stillBlocker(project: Project): Promise<string | null> {
  if (project.cast && project.cast.length > 0) return null;
  if (project.characterStillUrl) return null;
  await submitStillIfNeeded(project);
  return "角色定裝圖正在產生，請稍候再試";
}

// ---------- frames ----------

// Send one frame to the provider. The revision comes from the stored frame so
// a retry rebuilds exactly what the user asked for. Character blueprints are
// always attached; annotated redo images precede them. No job write.
export async function sendFrame(
  project: Project,
  clipNumber: number,
  position: FramePosition,
): Promise<Sent> {
  const skill = await loadSkill(project);
  const revision = project.frames?.find(
    (frame) => frame.clipNumber === clipNumber && frame.position === position,
  )?.revision;
  const sceneText = resolveSceneText(project);
  const prompt = buildFramePrompt(project, clipNumber, position, { revision });
  const refs = sceneImageReferenceUrls({
    annotatedUrl: revision?.annotatedUrl,
    lockUrls: frameLockReferenceUrls(project),
  });
  const model = imageModelForSubmit(resolveImageRoute(sceneText.language), refs.length > 0);
  const submitted = await submitImage({
    model,
    prompt,
    aspectRatio: project.aspectRatio,
    quality: skill.higgsfieldDefaults.imageQuality || "medium",
    resolution: skill.higgsfieldDefaults.imageResolution || "1k",
    negativePrompt: sceneTextNegativePrompt(sceneText.enabled, sceneText.inWorldLabels),
    sceneTextLanguage: sceneText.language,
    referenceImageUrls: refs,
  });
  return toSent(model, submitted);
}

// Queue one frame; the queue sends it (see task-senders) and refunds on failure.
async function enqueueFrame(project: Project, clipNumber: number, position: FramePosition) {
  const id = await insertPendingJob({
    projectId: project._id,
    clipIndex: clipNumber - 1,
    kind: "frame",
    framePosition: position,
  });
  kickJob(id);
}

export type FrameTarget = {
  clipNumber: number;
  position: FramePosition;
  // Director's remark / annotated reference for this redo, if any.
  revision?: FrameRevision;
};

// Queue one or more frames (caller already charged 1 credit each). Each old
// job is replaced, the frame is stamped `submittedAt`, and the project sits in
// `production` until the jobs settle. `project` must carry the storyboard the
// prompts should be built from, and the DB must hold the same storyboard and
// revision since the sender rebuilds from it (re-fetch after editing a clip).
export async function regenerateFrames(project: Project, targets: FrameTarget[]) {
  if (targets.length === 0) return { deferred: [] as FrameTarget[] };
  const jobs = await generationJobsCollection();
  const projects = await videosCollection();
  const submittedAt = new Date().toISOString();
  const { ready, deferred } = planFrameSubmissions(targets, project.frames);

  for (const target of ready) {
    await jobs.deleteMany({
      projectId: project._id,
      kind: "frame",
      clipIndex: target.clipNumber - 1,
      framePosition: target.position,
    });
    const prompt = buildFramePrompt(project, target.clipNumber, target.position, {
      revision: target.revision,
    });
    // Frame first, then the job: reconcile only trusts jobs created at or after
    // `submittedAt`. `$unset` rather than `$set: undefined` so the previous
    // failure message never lingers as `null`.
    await projects.updateOne(
      { _id: project._id },
      {
        $set: {
          "frames.$[frame].status": "queued",
          "frames.$[frame].submittedAt": submittedAt,
          "frames.$[frame].prompt": prompt,
          updatedAt: new Date(),
        },
        $unset: {
          "frames.$[frame].error": "",
          "frames.$[frame].blobUrl": "",
          "frames.$[frame].outputUrl": "",
        },
      },
      {
        arrayFilters: [
          { "frame.clipNumber": target.clipNumber, "frame.position": target.position },
        ],
      },
    );
    await enqueueFrame(project, target.clipNumber, target.position);
  }

  await projects.updateOne(
    { _id: project._id },
    { $set: { status: "production", updatedAt: new Date() } },
  );
  await syncProjectFromJobs(project._id);
  return { deferred };
}

// Recovery after a partial submit: frames go out one at a time, so the first
// may have a live job while the second threw. A frame submitted by THIS attempt
// belongs to reconciliation (it completes, or fails and refunds itself); a frame
// without one would sit `queued` forever with nothing to move it. `since` is the
// moment the attempt started, so a redo's leftover job from the previous attempt
// never masks a lost charge. Returns the count the caller must refund.
// `strict` keeps `exclude` as-is: for a single-frame redo the other position
// was never part of this attempt, so it must not be failed with the start.
export async function failUnsubmittedFrames(
  projectId: ObjectId,
  clipNumber: number,
  error: string,
  since: Date,
  exclude: FramePosition[] = [],
  options: { strict?: boolean } = {},
): Promise<number> {
  const jobs = await generationJobsCollection();
  const projects = await videosCollection();
  const frameJobs = await jobs
    .find({ projectId, kind: "frame", clipIndex: clipNumber - 1 })
    .toArray();
  const missed = options.strict
    ? unsubmittedPositions(frameJobs, since, exclude)
    : positionsToFail(frameJobs, since, exclude);

  for (const position of missed) {
    await projects.updateOne(
      { _id: projectId },
      {
        $set: {
          "frames.$[frame].status": "failed",
          "frames.$[frame].error": error,
          updatedAt: new Date(),
        },
      },
      { arrayFilters: [{ "frame.clipNumber": clipNumber, "frame.position": position }] },
    );
  }

  return missed.length;
}

// Single-frame convenience wrapper.
export async function regenerateFrame(
  project: Project,
  clipNumber: number,
  position: FramePosition,
  revision?: FrameRevision,
) {
  await regenerateFrames(project, [{ clipNumber, position, revision }]);
}

// ---------- video clips ----------

// Send one clip video from its two keyframes. No job write.
export async function sendClipVideo(
  project: Project,
  clipNumber: number,
  prompt: PhaseBPrompt,
): Promise<Sent> {
  const { start, end } = assertClipKeyframes(project.frames, clipNumber);
  const submitted = await submitClipVideo({
    prompt: prompt.prompt,
    aspectRatio: project.aspectRatio,
    durationSeconds: prompt.durationSeconds,
    startImageUrl: start,
    endImageUrl: end,
  });
  return toSent(MINIMAX_H3_VIDEO_MODEL, submitted);
}

// ---------- status sync ----------

function providerError(payload: unknown) {
  if (!payload || typeof payload !== "object") return undefined;
  const error = (payload as { error?: unknown }).error;
  if (typeof error === "string" && error) return error;
  const message = (payload as { message?: unknown }).message;
  return typeof message === "string" && message ? message : undefined;
}

// Sync providers (AliCloud edit) return a file on submit. Persist it now so
// the poller is not required for that job.
export async function persistImmediateSubmit(sent: Sent) {
  // `Sent` keeps the provider's `images` / `video` keys, which is all this reads.
  const outputUrl = mediaUrlFromResponse(sent);
  if (sent.status === "completed" && outputUrl) {
    await applyJobStatus({ requestId: sent.requestId, status: "completed", outputUrl });
  }
}

export async function applyJobStatus(input: {
  requestId: string;
  status: string;
  outputUrl?: string;
  error?: string;
}) {
  const jobs = await generationJobsCollection();
  const job = await jobs.findOne({ requestId: input.requestId });
  if (!job) return;

  const reported = input.status as GenerationStatus;
  let outputUrl = input.outputUrl;
  let errorMessage = input.error;
  let status = settleProviderStatus(reported, outputUrl);

  // Use the provider's reported status, not the settled one: completed-without-a-
  // file is rewritten to in_progress, but that is exactly when we must refetch.
  const statusUrl = job.statusUrl;
  const needsRefetch =
    Boolean(statusUrl) &&
    (((reported === "completed" || reported === "nsfw") && !outputUrl) ||
      ((reported === "failed" || reported === "nsfw") && !errorMessage));
  if (statusUrl && needsRefetch) {
    try {
      const remote = await fetchHiggsfieldStatus(statusUrl);
      outputUrl = mediaUrlFromResponse(remote) || outputUrl;
      status = settleProviderStatus(remote.status as GenerationStatus, outputUrl);
      const remoteError = providerError(remote);
      if (remoteError) errorMessage = remoteError;
    } catch (error) {
      console.error("[higgsfield] status refetch failed", {
        requestId: input.requestId,
        error,
      });
    }
  }

  const nowFailed = status === "failed" || status === "nsfw";
  // Prefer a clear user-facing reason; raw "nsfw" is not actionable in the UI.
  if (nowFailed) {
    errorMessage = userFacingJobError(status, errorMessage);
  }

  // Character sheets persist and refund in their own sync; no video to touch.
  if (job.kind === "character") {
    await syncCharacterJob(job, status, outputUrl);
    // `$set: { error: undefined }` would store null; clear the field instead.
    await jobs.updateOne(
      { _id: job._id },
      nowFailed
        ? {
            $set: {
              status,
              outputUrl,
              error: errorMessage || status,
              updatedAt: new Date(),
            },
          }
        : {
            $set: { status, outputUrl, updatedAt: new Date() },
            $unset: { error: "" },
          },
    );
    if (status === "completed" && outputUrl) {
      scheduleGenerationFinishedEmail(job._id);
    }
    return;
  }

  if (!job.projectId) return;
  const projectId = job.projectId;
  const projects = await videosCollection();
  const project = await projects.findOne({ _id: projectId });

  let blobUrl = job.blobUrl;
  // Persist successful files only. NSFW is a rejection even if a URL sneaks through.
  if (outputUrl && status === "completed") {
    const folder =
      job.kind === "still" ? "stills" : job.kind === "frame" ? "frames" : "clips";
    const transformOptions =
      project && (job.kind === "still" || job.kind === "frame")
        ? {
            transform: (buffer: Buffer) =>
              flattenToCanvas(buffer, videoStyle(project).canvasColor).catch(
                (error: unknown) => {
                  // Keep the original bytes rather than failing the job, but
                  // leave a trace so a broken flatten is not invisible.
                  console.error(
                    "[higgsfield] flatten failed; persisting original bytes",
                    { requestId: job.requestId, error },
                  );
                  return buffer;
                },
              ),
          }
        : undefined;
    blobUrl = await persistMedia(
      outputUrl,
      `explainer/${projectId.toHexString()}/${folder}/${job.requestId ?? job._id.toHexString()}`,
      transformOptions,
    );
  }

  const set = {
    status,
    outputUrl,
    blobUrl,
    updatedAt: new Date(),
  };
  // `$set: { error: undefined }` would store null; clear the field instead.
  const failureDetail = errorMessage || status;
  const update = nowFailed
    ? { $set: { ...set, error: failureDetail } }
    : { $set: set, $unset: { error: "" as const } };

  // The webhook and the poller can deliver the same failure concurrently, so
  // the flip to failed is an atomic claim: `findOneAndUpdate` only matches for
  // the caller that finds the job still unfailed, and only that one refunds.
  const claimedFailure = nowFailed
    ? Boolean(
        await jobs.findOneAndUpdate(
          { _id: job._id, status: { $nin: ["failed", "nsfw"] } },
          update,
        ),
      )
    : false;
  // Lost the claim (or not a failure at all): the fields still have to land.
  if (!claimedFailure) await jobs.updateOne({ _id: job._id }, update);

  // Each frame is 1 credit and each clip video is 1 credit; hand it back once,
  // the moment this caller is the one that marked the job failed.
  if (project && claimedFailure) {
    await refundClaimedFailure(job, project, errorMessage || status);
  }

  await syncProjectFromJobs(projectId);

  // Start finished first so the end still can lock to those pixels.
  if (
    job.kind === "frame" &&
    job.framePosition === "start" &&
    status === "completed" &&
    (blobUrl || outputUrl)
  ) {
    await submitDeferredEndIfNeeded(projectId, job.clipIndex + 1);
  }

  if (status === "completed" && (blobUrl || outputUrl)) {
    scheduleGenerationFinishedEmail(job._id);
  }
}

// Call only after winning the atomic flip to failed: refunds the job's credit
// and releases a deferred end whose start just failed.
export async function refundClaimedFailure(
  job: Pick<GenerationJob, "kind" | "framePosition" | "clipIndex">,
  project: Project,
  error: string,
) {
  if (job.kind === "frame") await refundCredits(project.clerkUserId, FRAME_COST);
  if (job.kind === "video") await refundCredits(project.clerkUserId, VIDEO_COST);
  if (job.kind === "frame" && job.framePosition === "start") {
    await failDeferredEndIfNeeded(project._id, job.clipIndex + 1, error);
  }
}

// Start failed before the end job existed: fail the waiting end and refund it.
export async function failDeferredEndIfNeeded(
  projectId: ObjectId,
  clipNumber: number,
  error: string,
) {
  const projects = await videosCollection();
  const jobs = await generationJobsCollection();
  const project = await projects.findOne({ _id: projectId });
  if (!project) return;
  const end = project.frames?.find(
    (frame) => frame.clipNumber === clipNumber && frame.position === "end",
  );
  // Waiting end may be queued with no job yet. Fail anything that has not
  // already started or finished.
  if (!end || end.status === "completed" || end.status === "in_progress") return;

  const claimedAt = end.submittedAt ? Date.parse(end.submittedAt) : NaN;
  const existing = await jobs.findOne({
    projectId,
    kind: "frame",
    clipIndex: clipNumber - 1,
    framePosition: "end",
  });
  // A job for THIS claim means reconciliation owns it; only fail ends that
  // never reached the provider (deferred / lost submit).
  if (
    existing &&
    (Number.isNaN(claimedAt) || existing.createdAt.getTime() >= claimedAt)
  ) {
    return;
  }

  const claimed = await projects.findOneAndUpdate(
    {
      _id: projectId,
      frames: {
        $elemMatch: { clipNumber, position: "end", status: "queued" },
      },
    },
    {
      $set: {
        "frames.$.status": "failed",
        "frames.$.error": userFacingJobError("failed", error),
        updatedAt: new Date(),
      },
    },
  );
  if (claimed) await refundCredits(project.clerkUserId, FRAME_COST);
}

// After this clip's start file lands, send the waiting end still with that
// start image attached as the composition lock.
export async function submitDeferredEndIfNeeded(
  projectId: ObjectId,
  clipNumber: number,
) {
  const projects = await videosCollection();
  const jobs = await generationJobsCollection();
  const project = await projects.findOne({ _id: projectId });
  if (!project) return;

  const end = project.frames?.find(
    (frame) => frame.clipNumber === clipNumber && frame.position === "end",
  );
  if (!end || end.status === "completed" || end.status === "in_progress") return;

  const claimedAt = end.submittedAt ? Date.parse(end.submittedAt) : NaN;
  const existing = await jobs.findOne({
    projectId,
    kind: "frame",
    clipIndex: clipNumber - 1,
    framePosition: "end",
  });
  if (
    existing &&
    (Number.isNaN(claimedAt) || existing.createdAt.getTime() >= claimedAt)
  ) {
    return;
  }

  const startUrl = clipKeyframeUrls(project.frames, clipNumber).start;
  if (!startUrl) return;

  const submittedAt = new Date().toISOString();
  await jobs.deleteMany({
    projectId,
    kind: "frame",
    clipIndex: clipNumber - 1,
    framePosition: "end",
  });
  const prompt = buildFramePrompt(project, clipNumber, "end", { revision: end.revision });
  // Frame first so the job's `createdAt` is never older than `submittedAt`.
  await projects.updateOne(
    { _id: projectId },
    {
      $set: {
        "frames.$[frame].status": "queued",
        "frames.$[frame].submittedAt": submittedAt,
        "frames.$[frame].prompt": prompt,
        updatedAt: new Date(),
      },
      $unset: { "frames.$[frame].error": "" },
    },
    { arrayFilters: [{ "frame.clipNumber": clipNumber, "frame.position": "end" }] },
  );
  try {
    await enqueueFrame(project, clipNumber, "end");
  } catch (error) {
    // No job owns the queued end: fail and refund it here. Not rethrown, so the
    // start's completion (applyJobStatus) still finishes.
    console.error("[frames] deferred end enqueue failed", { projectId, clipNumber, error });
    await failDeferredEndIfNeeded(
      projectId,
      clipNumber,
      error instanceof Error ? error.message : "分鏡圖排程失敗",
    );
  }
  await syncProjectFromJobs(projectId);
}

const ORPHAN_CLIP_ERROR = "影片沒有送出，credit 已退回，請再試一次";

// Reconcile attempts before giving up on a busy project; the next sync
// (webhook, cron or poll) picks up whatever this one could not land.
const SYNC_ATTEMPTS = 3;

// Reconcile every clip from its newest jobs, regardless of project status.
export async function syncProjectFromJobs(projectId: ObjectId) {
  for (let attempt = 1; attempt <= SYNC_ATTEMPTS; attempt += 1) {
    const outcome = await syncProjectOnce(projectId);
    if (outcome === "missing") return;
    if (outcome === "written") break;
    if (attempt === SYNC_ATTEMPTS) {
      console.warn("[sync] project kept changing; sync skipped", { projectId });
    }
  }

  // "產生全部影片" waits here until both stills for a clip have files.
  const { queueAutoClipVideos } = await import("@/service/clip/auto-video");
  await queueAutoClipVideos(projectId);
}

// One read-reconcile-write pass. The write is fenced on the `updatedAt` it
// read, so a concurrent writer's newer frames/clips are never replaced by this
// snapshot (e.g. a frame just failed and refunded going back to `queued`).
async function syncProjectOnce(projectId: ObjectId): Promise<"written" | "conflict" | "missing"> {
  const projects = await videosCollection();
  const jobs = await generationJobsCollection();
  const project = await projects.findOne({ _id: projectId });
  if (!project) return "missing";

  const allJobs = await jobs.find({ projectId }).toArray();
  // A deferred end stays `queued` with no job when its start fails before
  // submit. Release those so the redraw button is not stuck on "產生中".
  const orphans = orphanQueuedFrames(
    project.frames || [],
    allJobs,
    Date.now(),
    STUCK_CLAIM_MS,
  );
  for (const orphan of orphans) {
    const frame = project.frames?.find(
      (item) => item.clipNumber === orphan.clipNumber && item.position === orphan.position,
    );
    const start = project.frames?.find(
      (item) => item.clipNumber === orphan.clipNumber && item.position === "start",
    );
    const error =
      orphan.position === "end" && start?.status === "failed" && start.error
        ? start.error
        : "分鏡圖沒有送出，請再試一次";
    // Fenced on the claim so a re-queue since the read is never failed.
    const claimed = await projects.findOneAndUpdate(
      {
        _id: projectId,
        frames: {
          $elemMatch: {
            clipNumber: orphan.clipNumber,
            position: orphan.position,
            status: "queued",
            submittedAt: frame?.submittedAt,
          },
        },
      },
      {
        $set: {
          "frames.$.status": "failed",
          "frames.$.error": error,
          updatedAt: new Date(),
        },
      },
    );
    if (claimed) await refundCredits(project.clerkUserId, FRAME_COST);
  }
  // A charged clip video whose job never got inserted (or was lost) has nothing
  // to send or settle it. Fenced on the claim so a newer attempt is never failed.
  const orphanClips = orphanQueuedClips(project.clips || [], allJobs, Date.now(), STUCK_CLAIM_MS);
  for (const orphan of orphanClips) {
    const claimed = await projects.findOneAndUpdate(
      {
        _id: projectId,
        clips: {
          $elemMatch: {
            clipNumber: orphan.clipNumber,
            status: "queued",
            submittedAt: orphan.submittedAt,
          },
        },
      },
      {
        $set: {
          "clips.$.status": "failed",
          "clips.$.error": ORPHAN_CLIP_ERROR,
          updatedAt: new Date(),
        },
      },
    );
    if (claimed) await refundCredits(project.clerkUserId, VIDEO_COST);
  }
  const current =
    orphans.length || orphanClips.length
      ? await projects.findOne({ _id: projectId })
      : project;
  if (!current) return "missing";
  const still = allJobs
    .filter((job) => job.kind === "still")
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

  const set: Partial<Pick<Project, "characterStillUrl" | "stillError">> = {};
  const stillUrl = still?.blobUrl || still?.outputUrl;
  if (still?.status === "completed" && stillUrl && !current.characterStillUrl) {
    set.characterStillUrl = stillUrl;
  } else if (
    still &&
    (still.status === "failed" || still.status === "nsfw") &&
    !current.characterStillUrl
  ) {
    set.stillError = "角色定裝圖產生失敗，下次產生畫格時會自動重試";
  }

  const frames = reconcileFrames(current.frames || [], allJobs);
  const clips = reconcileClips(current.clips, allJobs);
  const next = { ...current, ...set, frames, clips };

  // Strictly newer than what was read, so a same-millisecond write still
  // invalidates every other snapshot of that version.
  const readAt = current.updatedAt?.getTime() ?? 0;
  const written = await projects.updateOne(
    { _id: projectId, updatedAt: current.updatedAt ?? null },
    {
      $set: {
        ...set,
        frames,
        clips,
        status: nextProjectStatus(next),
        updatedAt: new Date(Math.max(Date.now(), readAt + 1)),
      },
    },
  );
  return written.matchedCount > 0 ? "written" : "conflict";
}

export async function refreshProjectJobs(projectId: ObjectId) {
  const jobs = await generationJobsCollection();
  const candidates = await jobs
    .find({
      projectId,
      status: { $in: ["queued", "in_progress", "completed"] },
    })
    .toArray();
  const pending = candidates.filter(jobNeedsRefresh);

  // Fetch statuses in parallel, then apply sequentially so the project
  // sync never races itself.
  const results = await Promise.all(
    pending.map(async (job) => {
      const { statusUrl, requestId } = job;
      if (!statusUrl || !requestId) return null;
      try {
        return { job, requestId, status: await fetchHiggsfieldStatus(statusUrl) };
      } catch (error) {
        await jobs.updateOne(
          { _id: job._id },
          {
            $set: {
              error: error instanceof Error ? error.message : "status failed",
              updatedAt: new Date(),
            },
          },
        );
        return null;
      }
    }),
  );

  for (const result of results) {
    if (!result) continue;
    await applyJobStatus({
      requestId: result.requestId,
      status: result.status.status,
      outputUrl: mediaUrlFromResponse(result.status),
      error: providerError(result.status),
    });
  }

  await syncProjectFromJobs(projectId);
}

export type { GenerationJob };
