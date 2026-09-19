import { ObjectId } from "mongodb";
import { castReferenceUrls } from "@/lib/characters/cast-prompt";
import { syncCharacterJob } from "@/lib/characters/sync";
import {
  generationJobsCollection,
  skillsCollection,
  videosCollection,
} from "@/lib/collections";
import { refundCredits } from "@/lib/billing/credits";
import { flattenToCanvas } from "@/lib/higgsfield/flatten";
import { buildFramePrompt, videoStyle } from "@/lib/higgsfield/frame-prompts";
import {
  fetchHiggsfieldStatus,
  mediaUrlFromResponse,
  submitClipVideo,
  submitImage,
} from "@/lib/higgsfield/generate";
import { persistMedia } from "@/lib/higgsfield/persist";
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
    `Character visual lock still for a ${style.name} explainer video.`,
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
  options: { revision?: FrameRevision; styleRefUrl?: string } = {},
) {
  const jobs = await generationJobsCollection();
  const lockRefs =
    project.cast && project.cast.length > 0
      ? castReferenceUrls(project.cast)
      : [project.characterStillUrl, project.characterImageUrl];
  const submitted = await submitImage({
    model: skill.higgsfieldDefaults.imageModel,
    prompt: buildFramePrompt(project, clipNumber, position, options),
    aspectRatio: project.aspectRatio,
    quality: skill.higgsfieldDefaults.imageQuality || "medium",
    resolution: skill.higgsfieldDefaults.imageResolution || "1k",
    referenceImageUrls: [
      options.revision?.annotatedUrl,
      options.styleRefUrl,
      ...lockRefs,
    ].filter((url): url is string => Boolean(url)),
  });
  await jobs.insertOne({
    projectId: project._id,
    clipIndex: clipNumber - 1,
    kind: "frame",
    framePosition: position,
    model: skill.higgsfieldDefaults.imageModel,
    requestId: submitted.request_id,
    statusUrl: submitted.status_url,
    status: (submitted.status as GenerationStatus) || "queued",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
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
  if (targets.length === 0) return;
  const skill = await loadSkill(project);
  const jobs = await generationJobsCollection();
  const projects = await videosCollection();
  const submittedAt = new Date().toISOString();

  for (const target of targets) {
    await jobs.deleteMany({
      projectId: project._id,
      kind: "frame",
      clipIndex: target.clipNumber - 1,
      framePosition: target.position,
    });
    const sibling = project.frames?.find(
      (frame) =>
        frame.clipNumber === target.clipNumber &&
        frame.position !== target.position &&
        frame.status === "completed",
    );
    await submitOneFrame(project, skill, target.clipNumber, target.position, {
      revision: target.revision,
      styleRefUrl: sibling?.blobUrl || sibling?.outputUrl,
    });
    // A fresh submission has no error yet; `$unset` rather than `$set: undefined`
    // so the previous failure message never lingers as `null`.
    await projects.updateOne(
      { _id: project._id },
      {
        $set: {
          "frames.$[frame].status": "queued",
          "frames.$[frame].submittedAt": submittedAt,
        },
        $unset: { "frames.$[frame].error": "" },
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

function frameUrl(
  frames: ClipFrame[] | undefined,
  clipNumber: number,
  position: FramePosition,
) {
  const frame = frames?.find(
    (item) => item.clipNumber === clipNumber && item.position === position,
  );
  return frame?.status === "completed"
    ? frame.blobUrl || frame.outputUrl
    : undefined;
}

// Submit one clip's video (caller charged 1 credit and wrote the prompt).
// Replaces any previous video job for that clip.
export async function submitClipVideoJob(
  project: Project,
  clipNumber: number,
  prompt: PhaseBPrompt,
) {
  const skill = await loadSkill(project);
  const jobs = await generationJobsCollection();
  await jobs.deleteMany({ projectId: project._id, kind: "video", clipIndex: clipNumber - 1 });

  const fallbackRef =
    project.cast?.[0]?.blueprintUrl || project.characterStillUrl || project.characterImageUrl;
  const start = frameUrl(project.frames, clipNumber, "start");
  const end = frameUrl(project.frames, clipNumber, "end");
  const submitted = await submitClipVideo({
    model: skill.higgsfieldDefaults.videoModel,
    prompt: prompt.prompt,
    aspectRatio: project.aspectRatio,
    durationSeconds: prompt.durationSeconds,
    startImageUrl: start || fallbackRef,
    referenceImageUrls: [end, start ? fallbackRef : undefined],
  });
  await jobs.insertOne({
    projectId: project._id,
    clipIndex: clipNumber - 1,
    kind: "video",
    model: skill.higgsfieldDefaults.videoModel,
    requestId: submitted.request_id,
    statusUrl: submitted.status_url,
    status: (submitted.status as GenerationStatus) || "queued",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await syncProjectFromJobs(project._id);
}

// ---------- status sync ----------

export async function applyJobStatus(input: {
  requestId: string;
  status: string;
  outputUrl?: string;
}) {
  const jobs = await generationJobsCollection();
  const job = await jobs.findOne({ requestId: input.requestId });
  if (!job) return;

  const status = input.status as GenerationStatus;
  const nowFailed = status === "failed" || status === "nsfw";

  // Character sheets persist and refund in their own sync; no video to touch.
  if (job.kind === "character") {
    await syncCharacterJob(job, status, input.outputUrl);
    await jobs.updateOne(
      { _id: job._id },
      {
        $set: {
          status,
          outputUrl: input.outputUrl,
          error: nowFailed ? status : undefined,
          updatedAt: new Date(),
        },
      },
    );
    return;
  }

  if (!job.projectId) return;
  const projectId = job.projectId;
  const projects = await videosCollection();
  const project = await projects.findOne({ _id: projectId });

  let blobUrl = job.blobUrl;
  if (input.outputUrl && (status === "completed" || status === "nsfw")) {
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
      input.outputUrl,
      `explainer/${projectId.toHexString()}/${folder}/${job.requestId}`,
      transformOptions,
    );
  }

  const set = {
    status,
    outputUrl: input.outputUrl,
    blobUrl,
    error: nowFailed ? status : undefined,
    updatedAt: new Date(),
  };

  // The webhook and the poller can deliver the same failure concurrently, so
  // the flip to failed is an atomic claim: `findOneAndUpdate` only matches for
  // the caller that finds the job still unfailed, and only that one refunds.
  const claimedFailure = nowFailed
    ? Boolean(
        await jobs.findOneAndUpdate(
          { _id: job._id, status: { $nin: ["failed", "nsfw"] } },
          { $set: set },
        ),
      )
    : false;
  // Lost the claim (or not a failure at all): the fields still have to land.
  if (!claimedFailure) await jobs.updateOne({ _id: job._id }, { $set: set });

  // Each frame is 1 credit and each clip video is 1 credit; hand it back once,
  // the moment this caller is the one that marked the job failed.
  if (project && claimedFailure) {
    if (job.kind === "frame") await refundCredits(project.clerkUserId, FRAME_COST);
    if (job.kind === "video") await refundCredits(project.clerkUserId, VIDEO_COST);
  }

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
  const pending = await jobs
    .find({
      projectId,
      status: { $in: ["queued", "in_progress"] },
    })
    .toArray();

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
    });
  }

  await syncProjectFromJobs(projectId);
}

export type { GenerationJob };
