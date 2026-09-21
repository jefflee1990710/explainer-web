import { ObjectId } from "mongodb";
import { characterReferenceUrls } from "@/lib/characters/cast-prompt";
import { syncCharacterJob } from "@/lib/characters/sync";
import {
  generationJobsCollection,
  skillsCollection,
  videosCollection,
} from "@/lib/collections";
import { refundCredits } from "@/lib/billing/credits";
import { flattenToCanvas } from "@/lib/higgsfield/flatten";
import { sceneTextNegativePrompt, resolveSceneText } from "@/lib/director/scene-text";
import { imageModelForSubmit, resolveImageRoute } from "@/lib/generation/image-backend";
import { buildFramePrompt, videoStyle } from "@/lib/higgsfield/frame-prompts";
import { unsubmittedPositions } from "@/lib/higgsfield/job-attempts";
import {
  fetchHiggsfieldStatus,
  mediaUrlFromResponse,
  submitClipVideo,
  submitImage,
} from "@/lib/higgsfield/generate";
import { jobNeedsRefresh, settleProviderStatus, userFacingJobError } from "@/lib/higgsfield/job-status";
import { persistMedia } from "@/lib/higgsfield/persist";
import {
  MINIMAX_H3_VIDEO_MODEL,
  assertClipKeyframes,
  clipFrameAnchor,
  clipKeyframeUrls,
  planFrameSubmissions,
  type FrameAnchorKind,
} from "@/lib/higgsfield/clip-keyframes";
import {
  nextProjectStatus,
  reconcileClips,
  reconcileFrames,
} from "@/lib/higgsfield/reconcile";
import { FRAME_COST, VIDEO_COST } from "@/lib/production-plan";
import type { GenerationJob, GenerationStatus } from "@/types/generation-job";
import type {
  ClipFrame,
  FramePosition,
  FrameRevision,
  PhaseBPrompt,
  Project,
} from "@/types/project";
import type { Skill } from "@/types/skill";

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

  const skill = await loadSkill(project);
  const still = await submitImage({
    model: skill.higgsfieldDefaults.imageModel,
    prompt: stillPrompt(project),
    aspectRatio: project.aspectRatio,
    quality: skill.higgsfieldDefaults.imageQuality || "medium",
    resolution: skill.higgsfieldDefaults.imageResolution || "1k",
    referenceImageUrls: [project.characterImageUrl],
  });
  await jobs.insertOne({
    projectId: project._id,
    clipIndex: -1,
    kind: "still",
    model: skill.higgsfieldDefaults.imageModel,
    requestId: still.request_id,
    statusUrl: still.status_url,
    status: (still.status as GenerationStatus) || "queued",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await persistImmediateSubmit(still);
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

// Submit a single frame request and record the job. Redo references precede
// character locks so the prompt can identify them by attachment order.
async function submitOneFrame(
  project: Project,
  skill: Skill,
  clipNumber: number,
  position: FramePosition,
  options: {
    revision?: FrameRevision;
    styleRefUrl?: string;
    anchorKind?: FrameAnchorKind;
  } = {},
) {
  const jobs = await generationJobsCollection();
  const lockRefs = characterReferenceUrls(project);
  const sceneText = resolveSceneText(project);
  const prompt = buildFramePrompt(project, clipNumber, position, {
    revision: options.revision,
    styleRefUrl: options.styleRefUrl,
    anchorKind: options.anchorKind,
  });
  const refs = [
    options.revision?.annotatedUrl,
    options.styleRefUrl,
    ...lockRefs,
  ].filter((url): url is string => Boolean(url));
  const route = resolveImageRoute(sceneText.language);
  const submitted = await submitImage({
    model: imageModelForSubmit(route, refs.length > 0),
    prompt,
    aspectRatio: project.aspectRatio,
    quality: skill.higgsfieldDefaults.imageQuality || "medium",
    resolution: skill.higgsfieldDefaults.imageResolution || "1k",
    negativePrompt: sceneTextNegativePrompt(sceneText.enabled),
    sceneTextLanguage: sceneText.language,
    referenceImageUrls: refs,
  });
  await jobs.insertOne({
    projectId: project._id,
    clipIndex: clipNumber - 1,
    kind: "frame",
    framePosition: position,
    model: imageModelForSubmit(route, refs.length > 0),
    requestId: submitted.request_id,
    statusUrl: submitted.status_url,
    status: (submitted.status as GenerationStatus) || "queued",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await persistImmediateSubmit(submitted);
  return prompt;
}

export type FrameTarget = {
  clipNumber: number;
  position: FramePosition;
  // Director's remark / annotated reference for this redo, if any.
  revision?: FrameRevision;
};

// Submit one or more frames (caller already charged 1 credit each). Each old
// job is replaced, the frame is stamped `submittedAt`, and the project sits in
// `production` until the jobs settle. `project` must carry the storyboard the
// prompts should be built from (re-fetch after editing a clip).
export async function regenerateFrames(project: Project, targets: FrameTarget[]) {
  if (targets.length === 0) return { deferred: [] as FrameTarget[] };
  const skill = await loadSkill(project);
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
    const anchor = clipFrameAnchor(project.frames, target.clipNumber, target.position);
    const prompt = await submitOneFrame(project, skill, target.clipNumber, target.position, {
      revision: target.revision,
      styleRefUrl: anchor?.url,
      anchorKind: anchor?.kind,
    });
    // A fresh submission has no error yet; `$unset` rather than `$set: undefined`
    // so the previous failure message never lingers as `null`.
    await projects.updateOne(
      { _id: project._id },
      {
        $set: {
          "frames.$[frame].status": "queued",
          "frames.$[frame].submittedAt": submittedAt,
          "frames.$[frame].prompt": prompt,
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
export async function failUnsubmittedFrames(
  projectId: ObjectId,
  clipNumber: number,
  error: string,
  since: Date,
  exclude: FramePosition[] = [],
): Promise<number> {
  const jobs = await generationJobsCollection();
  const projects = await videosCollection();
  const frameJobs = await jobs
    .find({ projectId, kind: "frame", clipIndex: clipNumber - 1 })
    .toArray();
  const missed = unsubmittedPositions(frameJobs, since, exclude);

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

// Submit one clip's video (caller charged 1 credit and wrote the prompt).
// Replaces any previous video job for that clip.
export async function submitClipVideoJob(
  project: Project,
  clipNumber: number,
  prompt: PhaseBPrompt,
) {
  const jobs = await generationJobsCollection();
  await jobs.deleteMany({ projectId: project._id, kind: "video", clipIndex: clipNumber - 1 });

  const { start, end } = assertClipKeyframes(project.frames, clipNumber);
  const submitted = await submitClipVideo({
    prompt: prompt.prompt,
    aspectRatio: project.aspectRatio,
    durationSeconds: prompt.durationSeconds,
    startImageUrl: start,
    endImageUrl: end,
  });
  await jobs.insertOne({
    projectId: project._id,
    clipIndex: clipNumber - 1,
    kind: "video",
    model: MINIMAX_H3_VIDEO_MODEL,
    requestId: submitted.request_id,
    statusUrl: submitted.status_url,
    status: (submitted.status as GenerationStatus) || "queued",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await persistImmediateSubmit(submitted);
  await syncProjectFromJobs(project._id);
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
async function persistImmediateSubmit(submitted: {
  request_id: string;
  status?: string;
  images?: Array<{ url: string }>;
  video?: { url: string };
}) {
  const outputUrl = mediaUrlFromResponse(submitted);
  if (submitted.status === "completed" && outputUrl) {
    await applyJobStatus({
      requestId: submitted.request_id,
      status: "completed",
      outputUrl,
    });
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
      `explainer/${projectId.toHexString()}/${folder}/${job.requestId}`,
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
    if (job.kind === "frame") await refundCredits(project.clerkUserId, FRAME_COST);
    if (job.kind === "video") await refundCredits(project.clerkUserId, VIDEO_COST);
    if (job.kind === "frame" && job.framePosition === "start") {
      await failDeferredEndIfNeeded(
        projectId,
        job.clipIndex + 1,
        errorMessage || status,
      );
    }
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
}

// Start failed before the end job existed: fail the waiting end and refund it.
async function failDeferredEndIfNeeded(
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

  const skill = await loadSkill(project);
  const submittedAt = new Date().toISOString();
  await jobs.deleteMany({
    projectId,
    kind: "frame",
    clipIndex: clipNumber - 1,
    framePosition: "end",
  });
  await submitOneFrame(project, skill, clipNumber, "end", {
    revision: end.revision,
    styleRefUrl: startUrl,
    anchorKind: "clip-start",
  });
  await projects.updateOne(
    { _id: projectId },
    {
      $set: {
        "frames.$[frame].status": "queued",
        "frames.$[frame].submittedAt": submittedAt,
      },
      $unset: { "frames.$[frame].error": "" },
    },
    { arrayFilters: [{ "frame.clipNumber": clipNumber, "frame.position": "end" }] },
  );
  await syncProjectFromJobs(projectId);
}

// Reconcile every clip from its newest jobs, regardless of project status.
export async function syncProjectFromJobs(projectId: ObjectId) {
  const projects = await videosCollection();
  const jobs = await generationJobsCollection();
  const project = await projects.findOne({ _id: projectId });
  if (!project) return;

  const allJobs = await jobs.find({ projectId }).toArray();
  const still = allJobs
    .filter((job) => job.kind === "still")
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

  const set: Partial<Pick<Project, "characterStillUrl" | "stillError">> = {};
  const stillUrl = still?.blobUrl || still?.outputUrl;
  if (still?.status === "completed" && stillUrl && !project.characterStillUrl) {
    set.characterStillUrl = stillUrl;
  } else if (
    still &&
    (still.status === "failed" || still.status === "nsfw") &&
    !project.characterStillUrl
  ) {
    set.stillError = "角色定裝圖產生失敗，下次產生畫格時會自動重試";
  }

  const frames = reconcileFrames(project.frames || [], allJobs);
  const clips = reconcileClips(project.clips, allJobs);
  const next = { ...project, ...set, frames, clips };

  await projects.updateOne(
    { _id: projectId },
    {
      $set: {
        ...set,
        frames,
        clips,
        status: nextProjectStatus(next),
        updatedAt: new Date(),
      },
    },
  );
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
      if (!job.statusUrl) return null;
      try {
        return { job, status: await fetchHiggsfieldStatus(job.statusUrl) };
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
      requestId: result.job.requestId,
      status: result.status.status,
      outputUrl: mediaUrlFromResponse(result.status),
      error: providerError(result.status),
    });
  }

  await syncProjectFromJobs(projectId);
}

export type { GenerationJob };
