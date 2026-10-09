import { ObjectId } from "mongodb";
import { syncCharacterJob } from "@/service/character/sync";
import { syncDirectorPreviewJob } from "@/service/director/director-preview";
import { syncPostPreviewJob } from "@/service/post/sync-preview";
import { syncProductJob } from "@/service/product/sync";
import { syncStylePreviewJob } from "@/service/style/user-style-preview";
import { syncReelCoverJob } from "@/service/video-edit/reel-cover";
import {
  generationJobsCollection,
  videosCollection,
} from "@/dao";
import { refundCredits } from "@/service/billing/credits";
import { flattenToCanvas } from "@/service/higgsfield/flatten";
import { sceneTextNegativePrompt, resolveSceneText } from "@/service/director/scene-text";
import {
  IDEOGRAM_PROMPT_MAX,
  imageModelForSubmit,
  resolveImageRoute,
} from "@/service/generation/image-backend";
import { frameSubmitPlan, framesWithClipsReady } from "@/service/higgsfield/frame-prompts";
import { ensureFramePromptFits } from "@/service/higgsfield/shorten-frame-prompt";
import { hydrateStyles } from "@/service/style/load-style";
import { loadRenderableStyle } from "@/service/style/renderable-style";
import type { StylePromptSlice } from "@/service/style";
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
  clipVideoModel,
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
import { queueReelIfReady } from "@/service/reel/enqueue";
import { retimeMp4 } from "@/service/reel/retime";
import { swapClipVoice } from "@/service/voice/voice-swap";
import { voiceSwapVoiceId } from "@/model/character-voice-sample";
import { mediaSrc } from "@/util/media-src";
import { isBookendSkill } from "@/service/director/skill-rules";
import { withSceneCharacterLocks } from "@/service/higgsfield/scene-character-lock";
import { resolvePerformance } from "@/service/director/performance";
import { resolveRunSkill } from "@/service/director/run-skill";
import { talkingShotForSkill } from "@/service/director/talking-performance";
import { loadStoredSkill } from "@/service/director/load-skill";
import { chainsClipStarts } from "@/service/director/clip-continuity";
import {
  isInheritedTalkingHeadStart,
  isTalkingHeadSkill,
  withInheritedTalkingHeadStarts,
} from "@/service/director/talking-head";
import { chargedVideoCredits, FRAME_COST, STUCK_CLAIM_MS } from "@/service/production-plan";
import { lockDialogueSpeech } from "@/service/director/spoken-line";
import { toSent, type Sent } from "@/service/generation/sent";
import { frameJobDocs } from "@/service/generation/frame-jobs";
import {
  claimFailure,
  insertPendingJob,
  insertPendingJobs,
  kickJob,
} from "@/service/generation/task-store";
import type { GenerationJob, GenerationStatus } from "@/model/generation-job";
import type {
  FramePosition,
  FrameRevision,
  PhaseBPrompt,
  Project,
} from "@/model/project";
import type { Skill } from "@/model/skill";

// ---------- prompts ----------

function stillPrompt(project: Project, style: StylePromptSlice) {
  const lock = project.phaseA?.characterLock || "default explainer everyman";
  return [
    `Character visual lock still for a ${style.name} short video.`,
    `Canvas: ${style.canvas}. Look: ${style.look}. Never: ${style.negatives}.`,
    `Front three-quarter standing pose, identical character: ${lock}.`,
    `Aspect ratio ${project.aspectRatio}.`,
  ].join(" ");
}

async function loadSkill(project: Project): Promise<Skill> {
  const skill = await loadStoredSkill(project.skillId);
  if (!skill) throw new Error("找不到風格");
  return resolveRunSkill(skill);
}

// ---------- character still (free) ----------

// Send the character lock still to the provider (free). No job write.
export async function sendStill(project: Project): Promise<Sent> {
  const style = await loadRenderableStyle({
    styleId: project.styleId,
    ownerClerkUserId: project.clerkUserId,
  });
  const skill = await loadSkill(project);
  const model = imageModelForSubmit(resolveImageRoute(), Boolean(project.characterImageUrl));
  const submitted = await submitImage({
    model,
    prompt: stillPrompt(project, style),
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
// a retry rebuilds exactly what the user asked for. End stills attach this
// clip's start image as the composition lock; blueprints follow. No job write.
export async function sendFrame(
  project: Project,
  clipNumber: number,
  position: FramePosition,
): Promise<Sent> {
  const style = await loadRenderableStyle({
    styleId: project.styleId,
    ownerClerkUserId: project.clerkUserId,
  });
  const skill = await loadSkill(project);
  const revision = project.frames?.find(
    (frame) => frame.clipNumber === clipNumber && frame.position === position,
  )?.revision;
  const sceneText = resolveSceneText(project);
  const plan = frameSubmitPlan(project, clipNumber, position, revision, style);
  // Over the model's cap, Gemini compresses the prompt before the image request.
  const route = resolveImageRoute(sceneText.language);
  const prompt = route.model.startsWith("ideogram/")
    ? await ensureFramePromptFits(plan.prompt, undefined, IDEOGRAM_PROMPT_MAX)
    : await ensureFramePromptFits(plan.prompt);
  // A turnaround sheet shows the same person many times. Send one standing figure per character.
  const refs =
    project.cast && project.cast.length > 0
      ? await withSceneCharacterLocks(project.cast, plan.refs)
      : plan.refs;
  const model = imageModelForSubmit(route, refs.length > 0);
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

export type FrameTarget = {
  clipNumber: number;
  position: FramePosition;
  // Director's remark / annotated reference for this redo, if any.
  revision?: FrameRevision;
};

// One insert for a click's frame jobs: ready stills are kicked now, ends
// without a start file sit `pending` + `awaits: "start"` so the task list
// shows both tasks and the start's completion releases the end.
async function insertFrameJobs(
  project: Project,
  ready: FrameTarget[],
  deferred: FrameTarget[],
) {
  const ids = await insertPendingJobs(frameJobDocs(project._id, ready, deferred));
  ids.slice(0, ready.length).forEach((id) => kickJob(id));
}

// Queue one or more frames (caller already charged FRAME_COST each). Each old
// job is replaced, the frame is stamped `submittedAt`, and the project sits in
// `production` until the jobs settle. `project` must carry the storyboard the
// prompts should be built from, and the DB must hold the same storyboard and
// revision since the sender rebuilds from it (re-fetch after editing a clip).
export async function regenerateFrames(project: Project, targets: FrameTarget[]) {
  const drawable = targets.filter(
    (target) => !isInheritedTalkingHeadStart(project.skillSlug, target.clipNumber, target.position),
  );
  if (drawable.length === 0) return { deferred: [] as FrameTarget[] };
  targets = drawable;
  const jobs = await generationJobsCollection();
  const projects = await videosCollection();
  const submittedAt = new Date().toISOString();
  const { ready, deferred } = planFrameSubmissions(targets, project.frames);
  const style = await loadRenderableStyle({
    styleId: project.styleId,
    ownerClerkUserId: project.clerkUserId,
  });

  await jobs.deleteMany({
    projectId: project._id,
    kind: "frame",
    $or: targets.map((target) => ({
      clipIndex: target.clipNumber - 1,
      framePosition: target.position,
    })),
  });
  // Frames first, then the jobs: reconcile only trusts jobs created at or
  // after `submittedAt`. `$unset` rather than `$set: undefined` so the
  // previous failure message never lingers as `null`.
  for (const target of targets) {
    const { prompt } = frameSubmitPlan(
      project,
      target.clipNumber,
      target.position,
      target.revision,
      style,
    );
    await projects.updateOne(
      { _id: project._id },
      {
        $set: {
          "frames.$[frame].status": "queued",
          "frames.$[frame].submittedAt": submittedAt,
          "frames.$[frame].prompt": prompt,
          status: "production",
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
  }
  await insertFrameJobs(project, ready, deferred);
  // Do not reconcile here: enqueue should return after the jobs are written.
  // Cron / webhook / poll call syncProjectFromJobs once the provider moves.
  return { deferred };
}

// Queue every clip's start + end in one frames write and one jobs insert.
// Ends without a start file are parked (`awaits: "start"`) until it lands.
export async function enqueueClipFrameJobs(project: Project, clipNumbers: number[]) {
  if (clipNumbers.length === 0) return { deferred: [] as FrameTarget[] };
  const frames = withInheritedTalkingHeadStarts(
    await framesWithClipsReady(project, clipNumbers),
    project.skillSlug,
  );
  // Talking-head clip 2+ starts are copied from the previous end, never submitted.
  const targets: FrameTarget[] = clipNumbers.flatMap((clipNumber) =>
    (["start", "end"] as const)
      .filter((position) => !isInheritedTalkingHeadStart(project.skillSlug, clipNumber, position))
      .map((position) => ({ clipNumber, position })),
  );
  const { ready, deferred } = planFrameSubmissions(targets, frames);
  const jobs = await generationJobsCollection();
  const projects = await videosCollection();
  await projects.updateOne(
    { _id: project._id },
    { $set: { frames, status: "production", updatedAt: new Date() } },
  );
  await jobs.deleteMany({
    projectId: project._id,
    kind: "frame",
    clipIndex: { $in: clipNumbers.map((clipNumber) => clipNumber - 1) },
  });
  await insertFrameJobs(project, ready, deferred);
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
      // Only a frame this attempt flipped to `queued`; if the frames write
      // itself failed the old row (maybe completed) must stay untouched.
      {
        arrayFilters: [
          { "frame.clipNumber": clipNumber, "frame.position": position, "frame.status": "queued" },
        ],
      },
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
  // Talking-head locks must match the director's (possibly customised) performance slots.
  const talkingShot = talkingShotForSkill(project.skillSlug);
  const performance = talkingShot ? resolvePerformance(await loadSkill(project), talkingShot, "en") : undefined;
  const submitted = await submitClipVideo({
    prompt: lockDialogueSpeech(
      prompt.prompt,
      project.skillSlug,
      project.phaseA?.clips.find((clip) => clip.clipNumber === clipNumber)?.englishVo,
      project.cast?.map((member) => member.name),
      performance,
    ),
    aspectRatio: project.aspectRatio,
    durationSeconds: prompt.durationSeconds,
    startImageUrl: start,
    endImageUrl: end,
    styleId: project.styleId,
  });
  return toSent(clipVideoModel(project.styleId), submitted);
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

  if (job.kind === "reelCover") {
    await syncReelCoverJob(job, status, outputUrl);
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

  // Director previews persist onto the custom director and return before the video path.
  if (job.kind === "directorPreview") {
    await syncDirectorPreviewJob(job, status, outputUrl);
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

  if (job.kind === "product") {
    await syncProductJob(job, status, outputUrl);
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

  if (job.kind === "postPreview") {
    await syncPostPreviewJob(job, status, outputUrl);
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

  // Style previews persist onto the user style and return before the video path.
  if (job.kind === "stylePreview") {
    await syncStylePreviewJob(job, status, outputUrl);
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
  if (project) await hydrateStyles();

  let blobUrl = job.blobUrl;
  // Persist successful files only. NSFW is a rejection even if a URL sneaks through.
  if (outputUrl && status === "completed") {
    const folder =
      job.kind === "still" ? "stills" : job.kind === "frame" ? "frames" : "clips";
    const storyboardSeconds =
      project && job.kind === "video"
        ? project.phaseA?.clips.find((row) => row.clipNumber === job.clipIndex + 1)?.durationSeconds
        : undefined;
    // Bookends always play at 3–4s. Talking-head sentences under 5s are sped up
    // after the provider's 5s minimum render.
    const bookendSeconds =
      project &&
      storyboardSeconds &&
      (isBookendSkill(project.skillSlug) ||
        (isTalkingHeadSkill(project.skillSlug) && storyboardSeconds < 5))
        ? storyboardSeconds
        : undefined;
    const canvasColor =
      project && !bookendSeconds && (job.kind === "still" || job.kind === "frame")
        ? (
            await loadRenderableStyle({
              styleId: project.styleId,
              ownerClerkUserId: project.clerkUserId,
            })
          ).canvasColor
        : undefined;
    // One-character cast with a demo voice: re-voice before any retime.
    const voiceId =
      project && job.kind === "video" && !isBookendSkill(project.skillSlug)
        ? voiceSwapVoiceId(project.cast)
        : null;
    const swapVoice = (buffer: Buffer) =>
      voiceId
        ? swapClipVoice(buffer, voiceId).catch((error: unknown) => {
            console.error("[higgsfield] voice swap failed; keeping clip audio", {
              requestId: job.requestId,
              error,
            });
            return buffer;
          })
        : Promise.resolve(buffer);
    const transformOptions =
      bookendSeconds
        ? {
            // Provider renders ≥5s; bookends play at their 3–4s storyboard length.
            transform: async (buffer: Buffer) => {
              const voiced = await swapVoice(buffer);
              return retimeMp4(voiced, bookendSeconds).catch((error: unknown) => {
                console.error("[higgsfield] bookend retime failed; persisting original", {
                  requestId: job.requestId,
                  error,
                });
                return voiced;
              });
            },
          }
        : voiceId
        ? { transform: swapVoice }
        : canvasColor
        ? {
            transform: (buffer: Buffer) =>
              flattenToCanvas(buffer, canvasColor).catch(
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

  // Each frame is FRAME_COST; a clip video returns what it was charged. Hand it back once,
  // the moment this caller is the one that marked the job failed.
  if (project && claimedFailure) {
    await refundClaimedFailure(job, project, errorMessage || status);
  }

  await syncProjectFromJobs(projectId);

  // Last clip video just landed: queue 成片合成 as a background task.
  if (job.kind === "video" && status === "completed" && (blobUrl || outputUrl)) {
    await queueReelIfReady(projectId);
  }

  // Start finished first so the end still can lock to those pixels.
  if (
    job.kind === "frame" &&
    job.framePosition === "start" &&
    status === "completed" &&
    (blobUrl || outputUrl)
  ) {
    await submitDeferredEndIfNeeded(projectId, job.clipIndex + 1);
  }

  // Previous end landed, so the next clip's start can use it as the place reference.
  if (
    job.kind === "frame" &&
    job.framePosition === "end" &&
    status === "completed" &&
    (blobUrl || outputUrl)
  ) {
    await submitDeferredNextStartIfNeeded(projectId, job.clipIndex + 1);
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
  if (job.kind === "video") {
    const clip = project.clips.find((item) => item.clipNumber === job.clipIndex + 1);
    await refundCredits(project.clerkUserId, chargedVideoCredits(clip));
  }
  if (job.kind === "frame" && job.framePosition === "start") {
    await failDeferredEndIfNeeded(project._id, job.clipIndex + 1, error);
  }
  if (job.kind === "frame" && job.framePosition === "end") {
    await failDeferredNextStartIfNeeded(project._id, job.clipIndex + 1, error);
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
  if (
    existing &&
    (Number.isNaN(claimedAt) || existing.createdAt.getTime() >= claimedAt)
  ) {
    // Parked end (never sent): flip it failed, refund, and let reconcile copy
    // the failure onto the frame. Winning the flip guards the refund.
    if (existing.status === "pending" && existing.awaits === "start") {
      const failed = await claimFailure(existing._id, error, "failed", { awaits: "start" });
      if (failed) {
        await refundCredits(project.clerkUserId, FRAME_COST);
        await syncProjectFromJobs(projectId);
      }
      return;
    }
    // A live job for THIS claim means reconciliation owns it.
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

// After this clip's start file lands, send the waiting end still. sendFrame
// attaches that start image as the composition lock.
export async function submitDeferredEndIfNeeded(
  projectId: ObjectId,
  clipNumber: number,
  options: { resync?: boolean } = {},
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
  const startUrl = clipKeyframeUrls(project.frames, clipNumber).start;
  if (
    existing &&
    (Number.isNaN(claimedAt) || existing.createdAt.getTime() >= claimedAt)
  ) {
    // Parked end from the click: make it claimable and send it now. The
    // sender rebuilds the prompt, so only the schedule changes here.
    if (existing.status === "pending" && existing.awaits === "start" && startUrl) {
      const released = await jobs.updateOne(
        { _id: existing._id, status: "pending", awaits: "start" },
        { $set: { nextAttemptAt: new Date(), updatedAt: new Date() }, $unset: { awaits: "" } },
      );
      if (released.modifiedCount > 0) kickJob(existing._id);
    }
    return;
  }

  if (!startUrl) return;

  const submittedAt = new Date().toISOString();
  await jobs.deleteMany({
    projectId,
    kind: "frame",
    clipIndex: clipNumber - 1,
    framePosition: "end",
  });
  const style = await loadRenderableStyle({
    styleId: project.styleId,
    ownerClerkUserId: project.clerkUserId,
  });
  const { prompt } = frameSubmitPlan(project, clipNumber, "end", end.revision, style);
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
    await insertFrameJobs(project, [{ clipNumber, position: "end" }], []);
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
  if (options.resync !== false) await syncProjectFromJobs(projectId);
}

// After the previous clip's end file lands, send the next clip's waiting start.
export async function submitDeferredNextStartIfNeeded(projectId: ObjectId, clipNumber: number) {
  const nextClip = clipNumber + 1;
  const jobs = await generationJobsCollection();
  const projects = await videosCollection();
  const endUrl = clipKeyframeUrls(
    (await projects.findOne({ _id: projectId }))?.frames,
    clipNumber,
  ).end;
  if (!endUrl) return;
  const existing = await jobs.findOne({
    projectId,
    kind: "frame",
    clipIndex: nextClip - 1,
    framePosition: "start",
  });
  if (existing?.status === "pending" && existing.awaits === "prev-end") {
    const released = await jobs.updateOne(
      { _id: existing._id, status: "pending", awaits: "prev-end" },
      { $set: { nextAttemptAt: new Date(), updatedAt: new Date() }, $unset: { awaits: "" } },
    );
    if (released.modifiedCount > 0) kickJob(existing._id);
  }
}

// Previous end failed: the next start was waiting on it, so fail and refund that still.
export async function failDeferredNextStartIfNeeded(
  projectId: ObjectId,
  clipNumber: number,
  error: string,
) {
  const nextClip = clipNumber + 1;
  const jobs = await generationJobsCollection();
  const projects = await videosCollection();
  const project = await projects.findOne({ _id: projectId });
  if (!project) return;
  const existing = await jobs.findOne({
    projectId,
    kind: "frame",
    clipIndex: nextClip - 1,
    framePosition: "start",
  });
  if (existing?.status === "pending" && existing.awaits === "prev-end") {
    const failed = await claimFailure(existing._id, error, "failed", { awaits: "prev-end" });
    if (failed) {
      await refundCredits(project.clerkUserId, FRAME_COST);
      await syncProjectFromJobs(projectId);
    }
  }
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

  await inheritTalkingHeadStarts(projectId);

  // "產生全部影片" waits here until both stills for a clip have files.
  const { queueAutoClipVideos } = await import("@/service/clip/auto-video");
  await queueAutoClipVideos(projectId);
}

// Copy each finished talking-head end still onto the next clip's start, then
// let that clip's end still generate against the copied file.
async function inheritTalkingHeadStarts(projectId: ObjectId) {
  const projects = await videosCollection();
  const project = await projects.findOne({ _id: projectId });
  if (!project || !chainsClipStarts(project.skillSlug)) return;
  const frames = project.frames || [];
  const copied = withInheritedTalkingHeadStarts(frames, project.skillSlug);
  for (const frame of copied) {
    if (!isInheritedTalkingHeadStart(project.skillSlug, frame.clipNumber, frame.position)) continue;
    const current = frames.find(
      (item) => item.clipNumber === frame.clipNumber && item.position === "start",
    );
    if (!current || (current.status === "completed" && mediaSrc(current) === mediaSrc(frame))) {
      continue;
    }
    if (frame.status !== "completed" || !mediaSrc(frame)) continue;
    await projects.updateOne(
      { _id: projectId },
      {
        $set: {
          "frames.$[frame].status": "completed",
          "frames.$[frame].blobUrl": frame.blobUrl,
          "frames.$[frame].outputUrl": frame.outputUrl,
          "frames.$[frame].submittedAt": frame.submittedAt,
          updatedAt: new Date(),
        },
        $unset: { "frames.$[frame].error": "" },
      },
      { arrayFilters: [{ "frame.clipNumber": frame.clipNumber, "frame.position": "start" }] },
    );
    await submitDeferredEndIfNeeded(projectId, frame.clipNumber, { resync: false });
  }
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
    if (isInheritedTalkingHeadStart(project.skillSlug, orphan.clipNumber, orphan.position)) {
      const prevEnd = project.frames?.find(
        (item) => item.clipNumber === orphan.clipNumber - 1 && item.position === "end",
      );
      // Waiting on the previous end is not a lost job, and it was not charged.
      if (prevEnd?.status !== "failed") continue;
      await projects.updateOne(
        {
          _id: projectId,
          frames: {
            $elemMatch: {
              clipNumber: orphan.clipNumber,
              position: "start",
              status: "queued",
            },
          },
        },
        {
          $set: {
            "frames.$.status": "failed",
            "frames.$.error": prevEnd.error || "上一段結尾圖失敗，起始圖無法沿用",
            updatedAt: new Date(),
          },
        },
      );
      continue;
    }
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
    if (claimed) {
      const clip = project.clips.find((item) => item.clipNumber === orphan.clipNumber);
      await refundCredits(project.clerkUserId, chargedVideoCredits(clip));
    }
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
  // The character still just landed: queue scene images for this new video.
  if (written.matchedCount > 0 && set.characterStillUrl) {
    const { enqueueSceneImagesForNewVideo } = await import("@/service/clip/enqueue-scene-images");
    await enqueueSceneImagesForNewVideo(projectId).catch((error) => {
      console.error("[frames] auto enqueue after still failed", { projectId, error });
    });
  }
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
