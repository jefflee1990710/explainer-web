import { ObjectId } from "mongodb";
import {
  generationJobsCollection,
  projectsCollection,
  skillsCollection,
} from "@/lib/collections";
import {
  fetchHiggsfieldStatus,
  mediaUrlFromResponse,
  submitCharacterStill,
  submitClipVideo,
} from "@/lib/higgsfield/generate";
import { persistMedia } from "@/lib/higgsfield/persist";
import { refundCredits } from "@/lib/billing/credits";
import type { GenerationJob, GenerationStatus } from "@/types/generation-job";
import type { Project } from "@/types/project";

function stillPrompt(project: Project) {
  const lock = project.phaseA?.characterLock || "default whiteboard everyman";
  return `Character visual lock still for a whiteboard-doodle cartoon explainer. Clean solid white canvas, bold irregular black outlines, flat marker fills, no photorealism, no chalkboard. Front three-quarter standing pose, identical character: ${lock}. Aspect ratio ${project.aspectRatio}.`;
}

export async function startProjectGeneration(project: Project) {
  const skills = await skillsCollection();
  const skill = await skills.findOne({ _id: project.skillId });
  if (!skill || !project.phaseA || !project.phaseB) {
    throw new Error("專案尚未準備好產片");
  }

  const jobs = await generationJobsCollection();
  const projects = await projectsCollection();
  const still = await submitCharacterStill({
    model: skill.higgsfieldDefaults.imageModel,
    prompt: stillPrompt(project),
    aspectRatio: project.aspectRatio,
    quality: skill.higgsfieldDefaults.imageQuality || "low",
    resolution: skill.higgsfieldDefaults.imageResolution || "1k",
    referenceImageUrl: project.characterImageUrl,
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
    { $set: { status: "generating", error: undefined, updatedAt: new Date() } },
  );
}

async function submitClipJobs(project: Project) {
  const skills = await skillsCollection();
  const skill = await skills.findOne({ _id: project.skillId });
  if (!skill || !project.phaseB) return;

  const jobs = await generationJobsCollection();
  const existing = await jobs
    .find({ projectId: project._id, kind: "video" })
    .toArray();
  if (existing.length > 0) return;

  const reference =
    project.characterStillUrl || project.characterImageUrl;

  for (const prompt of project.phaseB.prompts) {
    const submitted = await submitClipVideo({
      model: skill.higgsfieldDefaults.videoModel,
      prompt: prompt.prompt,
      aspectRatio: project.aspectRatio,
      durationSeconds: prompt.durationSeconds,
      referenceImageUrl: reference,
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
  }
}

export async function applyJobStatus(input: {
  requestId: string;
  status: string;
  outputUrl?: string;
}) {
  const jobs = await generationJobsCollection();
  const job = await jobs.findOne({ requestId: input.requestId });
  if (!job) return;

  const status = input.status as GenerationStatus;
  let blobUrl = job.blobUrl;
  if (input.outputUrl && (status === "completed" || status === "nsfw")) {
    const folder = job.kind === "still" ? "stills" : "clips";
    blobUrl = await persistMedia(
      input.outputUrl,
      `explainer/${job.projectId.toHexString()}/${folder}/${job.requestId}`,
    );
  }

  await jobs.updateOne(
    { _id: job._id },
    {
      $set: {
        status,
        outputUrl: input.outputUrl,
        blobUrl,
        error: status === "failed" || status === "nsfw" ? status : undefined,
        updatedAt: new Date(),
      },
    },
  );

  await syncProjectFromJobs(job.projectId);
}

async function syncProjectFromJobs(projectId: ObjectId) {
  const projects = await projectsCollection();
  const jobs = await generationJobsCollection();
  const project = await projects.findOne({ _id: projectId });
  if (!project) return;

  const allJobs = await jobs.find({ projectId }).toArray();
  const still = allJobs.find((job) => job.kind === "still");
  const videos = allJobs
    .filter((job) => job.kind === "video")
    .sort((a, b) => a.clipIndex - b.clipIndex);

  const stillUrl = still?.blobUrl || still?.outputUrl;
  if (still?.status === "completed" && stillUrl && !project.characterStillUrl) {
    await projects.updateOne(
      { _id: projectId },
      { $set: { characterStillUrl: stillUrl, updatedAt: new Date() } },
    );
    project.characterStillUrl = stillUrl;
  }

  if (still?.status === "completed" && videos.length === 0) {
    await submitClipJobs(project);
    return;
  }

  if (still && (still.status === "failed" || still.status === "nsfw")) {
    await failProject(project, "角色定裝圖產生失敗");
    return;
  }

  if (videos.length === 0) return;

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
    await failProject(project, "有片段產生失敗");
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

async function failProject(project: Project, error: string) {
  const projects = await projectsCollection();
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

  for (const job of pending) {
    if (!job.statusUrl) continue;
    try {
      const status = await fetchHiggsfieldStatus(job.statusUrl);
      await applyJobStatus({
        requestId: job.requestId,
        status: status.status,
        outputUrl: mediaUrlFromResponse(status),
      });
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
    }
  }

  await syncProjectFromJobs(projectId);
}

export type { GenerationJob };
