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
import {
  buildFramePrompt,
  videoStyle,
} from "@/lib/higgsfield/frame-prompts";
import {
  fetchHiggsfieldStatus,
  mediaUrlFromResponse,
  submitClipVideo,
  submitImage,
} from "@/lib/higgsfield/generate";
import { persistMedia } from "@/lib/higgsfield/persist";
import type { GenerationJob, GenerationStatus } from "@/types/generation-job";
import type {
  ClipFrame,
  FramePosition,
  FrameRevision,
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

function toFrameStatus(status?: GenerationStatus): ClipFrame["status"] {
  if (status === "completed") return "completed";
  if (status === "failed" || status === "nsfw") return "failed";
  if (status === "in_progress") return "in_progress";
  return "queued";
}

// ---------- stage 1: storyboard frames ----------

// Kick off the character still; frames are submitted (in parallel) once it lands.
export async function startFrameGeneration(project: Project) {
  if (!project.phaseA) throw new Error("尚未有分鏡");
  const skill = await loadSkill(project);
  const jobs = await generationJobsCollection();
  const projects = await videosCollection();

  await projects.updateOne(
    { _id: project._id },
    {
      $set: {
        status: "frames_generating",
        error: undefined,
        updatedAt: new Date(),
      },
    },
  );

  // With a cast, the blueprints are the lock: skip the still and go straight to frames.
  if (project.cast && project.cast.length > 0) {
    await submitFrameJobs(project);
    return;
  }

  const existingStill = await jobs.findOne({
    projectId: project._id,
    kind: "still",
  });

  if (!existingStill) {
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
  }

  // A still from an earlier run may already be done; don't wait on it.
  if (project.characterStillUrl) await submitFrameJobs(project);
}

// Submit a single frame request and record the job. A revision (redo with
// director's remark / annotated previous frame) prepends the annotated image
// as the first reference so the prompt can refer to it.
async function submitOneFrame(
  project: Project,
  skill: Skill,
  clipNumber: number,
  position: FramePosition,
  revision?: FrameRevision,
) {
  const jobs = await generationJobsCollection();
  const lockRefs =
    project.cast && project.cast.length > 0
      ? castReferenceUrls(project.cast)
      : [project.characterStillUrl, project.characterImageUrl];
  const submitted = await submitImage({
    model: skill.higgsfieldDefaults.imageModel,
    prompt: buildFramePrompt(project, clipNumber, position, { revision }),
    aspectRatio: project.aspectRatio,
    quality: skill.higgsfieldDefaults.imageQuality || "medium",
    resolution: skill.higgsfieldDefaults.imageResolution || "1k",
    referenceImageUrls: [revision?.annotatedUrl, ...lockRefs],
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

// All start/end frames go out at once.
async function submitFrameJobs(project: Project) {
  const skill = await loadSkill(project);
  const projects = await videosCollection();

  // Atomic claim: webhook and poller may both observe the still completing.
  const claimed = await projects.findOneAndUpdate(
    { _id: project._id, framesSubmittedAt: { $exists: false } },
    { $set: { framesSubmittedAt: new Date() } },
  );
  if (!claimed) return;

  const rows = project.phaseA?.clips || [];
  const results = await Promise.allSettled(
    rows.flatMap((row) =>
      (["start", "end"] as FramePosition[]).map((position) =>
        submitOneFrame(project, skill, row.clipNumber, position),
      ),
    ),
  );

  const rejected = results.filter((r) => r.status === "rejected");
  if (rejected.length === results.length && results.length > 0) {
    // Nothing went out: release the claim so a retry can resubmit.
    await projects.updateOne(
      { _id: project._id },
      { $unset: { framesSubmittedAt: "" } },
    );
    const first = rejected[0] as PromiseRejectedResult;
    throw first.reason instanceof Error
      ? first.reason
      : new Error("分鏡圖送出失敗");
  }
}

export type FrameTarget = {
  clipNumber: number;
  position: FramePosition;
  // Director's remark / annotated reference for this redo, if any.
  revision?: FrameRevision;
};

// Re-run one or more frames (caller already charged 1 credit each). Each old
// job is replaced; the project flips back to `frames_generating` until every
// frame settles again. `project` must carry the storyboard the prompts should
// be built from (re-fetch after editing a clip).
export async function regenerateFrames(project: Project, targets: FrameTarget[]) {
  if (targets.length === 0) return;
  const skill = await loadSkill(project);
  const jobs = await generationJobsCollection();
  const projects = await videosCollection();

  for (const target of targets) {
    await jobs.deleteMany({
      projectId: project._id,
      kind: "frame",
      clipIndex: target.clipNumber - 1,
      framePosition: target.position,
    });
    await submitOneFrame(
      project,
      skill,
      target.clipNumber,
      target.position,
      target.revision,
    );
  }

  await projects.updateOne(
    { _id: project._id },
    { $set: { status: "frames_generating", updatedAt: new Date() } },
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

// ---------- stage 2: video clips ----------

// Called after Phase B with frames approved; submits every clip video.
export async function startProjectGeneration(project: Project) {
  if (!project.phaseA || !project.phaseB) {
    throw new Error("專案尚未準備好產片");
  }
  const projects = await videosCollection();
  await projects.updateOne(
    { _id: project._id },
    { $set: { status: "generating", error: undefined, updatedAt: new Date() } },
  );
  await submitClipJobs(project);
}

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

async function submitClipJobs(project: Project) {
  const skill = await loadSkill(project);
  if (!project.phaseB) return;

  const jobs = await generationJobsCollection();
  const existing = await jobs.countDocuments({
    projectId: project._id,
    kind: "video",
  });
  if (existing > 0) return;

  const fallbackRef =
    project.cast?.[0]?.blueprintUrl || project.characterStillUrl || project.characterImageUrl;

  // Videos are independent; submit them together.
  await Promise.all(
    project.phaseB.prompts.map(async (prompt) => {
      const start = frameUrl(project.frames, prompt.clipNumber, "start");
      const end = frameUrl(project.frames, prompt.clipNumber, "end");
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
        clipIndex: prompt.clipNumber - 1,
        kind: "video",
        model: skill.higgsfieldDefaults.videoModel,
        requestId: submitted.request_id,
        statusUrl: submitted.status_url,
        status: (submitted.status as GenerationStatus) || "queued",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }),
  );
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
  const wasFailed = job.status === "failed" || job.status === "nsfw";

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
                () => buffer,
              ),
          }
        : undefined;
    blobUrl = await persistMedia(
      input.outputUrl,
      `explainer/${projectId.toHexString()}/${folder}/${job.requestId}`,
      transformOptions,
    );
  }

  await jobs.updateOne(
    { _id: job._id },
    {
      $set: {
        status,
        outputUrl: input.outputUrl,
        blobUrl,
        error: nowFailed ? status : undefined,
        updatedAt: new Date(),
      },
    },
  );

  // Each frame is 1 credit; hand it back the moment that frame fails.
  if (job.kind === "frame" && nowFailed && !wasFailed) {
    if (project) await refundCredits(project.clerkUserId, 1);
  }

  await syncProjectFromJobs(projectId);
}

async function syncProjectFromJobs(projectId: ObjectId) {
  const projects = await videosCollection();
  const jobs = await generationJobsCollection();
  const project = await projects.findOne({ _id: projectId });
  if (!project) return;

  const allJobs = await jobs.find({ projectId }).toArray();
  const still = allJobs.find((job) => job.kind === "still");
  const frameJobs = allJobs.filter((job) => job.kind === "frame");
  const videos = allJobs
    .filter((job) => job.kind === "video")
    .sort((a, b) => a.clipIndex - b.clipIndex);

  // Character still → unlock frames.
  const stillUrl = still?.blobUrl || still?.outputUrl;
  if (still?.status === "completed" && stillUrl && !project.characterStillUrl) {
    await projects.updateOne(
      { _id: projectId },
      { $set: { characterStillUrl: stillUrl, updatedAt: new Date() } },
    );
    project.characterStillUrl = stillUrl;
  }

  if (project.status === "frames_generating") {
    if (still && (still.status === "failed" || still.status === "nsfw")) {
      await failFramesStage(project, "角色定裝圖產生失敗");
      return;
    }
    if (still?.status === "completed" && frameJobs.length === 0) {
      try {
        await submitFrameJobs(project);
      } catch (error) {
        await failFramesStage(
          project,
          error instanceof Error ? error.message : "分鏡圖送出失敗",
        );
      }
      return;
    }
    if (frameJobs.length === 0) return;

    const frames: ClipFrame[] = (project.frames || []).map((frame) => {
      const job = frameJobs.find(
        (item) =>
          item.clipIndex === frame.clipNumber - 1 &&
          item.framePosition === frame.position,
      );
      return {
        ...frame,
        status: toFrameStatus(job?.status),
        outputUrl: job?.outputUrl,
        blobUrl: job?.blobUrl,
        error: job?.error,
      };
    });

    const settled = frames.every(
      (frame) => frame.status === "completed" || frame.status === "failed",
    );
    await projects.updateOne(
      { _id: projectId },
      {
        $set: {
          frames,
          status: settled ? "frames_ready" : "frames_generating",
          updatedAt: new Date(),
        },
      },
    );
    return;
  }

  if (project.status !== "generating" || videos.length === 0) return;

  const clips = (project.phaseB?.prompts || []).map((prompt) => {
    const job = videos.find((item) => item.clipIndex === prompt.clipNumber - 1);
    return {
      clipNumber: prompt.clipNumber,
      durationSeconds: prompt.durationSeconds,
      prompt: prompt.prompt,
      status:
        job?.status === "completed"
          ? ("completed" as const)
          : job?.status === "failed" || job?.status === "nsfw"
            ? ("failed" as const)
            : job?.status === "in_progress"
              ? ("in_progress" as const)
              : ("queued" as const),
      outputUrl: job?.outputUrl,
      blobUrl: job?.blobUrl,
      error: job?.error,
    };
  });

  const failed = videos.some(
    (job) => job.status === "failed" || job.status === "nsfw",
  );
  const completed =
    videos.length > 0 && videos.every((job) => job.status === "completed");

  if (failed) {
    await failVideoStage(project, "有片段產生失敗");
    await projects.updateOne(
      { _id: projectId },
      { $set: { clips, updatedAt: new Date() } },
    );
    return;
  }

  await projects.updateOne(
    { _id: projectId },
    {
      $set: {
        clips,
        status: completed ? "ready" : "generating",
        updatedAt: new Date(),
      },
    },
  );
}

// Still failed before any frame went out: refund the whole frames charge.
async function failFramesStage(project: Project, error: string) {
  const projects = await videosCollection();
  if (project.framesCharged && project.framesCreditCost) {
    await refundCredits(project.clerkUserId, project.framesCreditCost);
  }
  await projects.updateOne(
    { _id: project._id },
    {
      $set: {
        status: "failed",
        error,
        framesCharged: false,
        updatedAt: new Date(),
      },
    },
  );
}

async function failVideoStage(project: Project, error: string) {
  const projects = await videosCollection();
  if (project.creditsCharged && project.creditCost > 0) {
    await refundCredits(project.clerkUserId, project.creditCost);
  }
  await projects.updateOne(
    { _id: project._id },
    {
      $set: {
        status: "failed",
        error,
        creditsCharged: false,
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
  // sync never races itself (e.g. double-submitting frames).
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
