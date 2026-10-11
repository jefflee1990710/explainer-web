import type { ObjectId } from "mongodb";
import { generationJobsCollection, usersCollection, videosCollection } from "@/dao";
import type { GenerationJob } from "@/model/generation-job";
import type { BackgroundPlate, Project } from "@/model/project";
import {
  assertCanSpendCredits,
  consumeCredits,
  refundCredits,
} from "@/service/billing/credits";
import { FRAME_COST } from "@/service/credit-costs";
import {
  applyVideoLocksToClips,
  planVideoLocks,
  shouldPlanVideoLocks,
  videoLocksFingerprint,
  type VideoLocksPlan,
} from "@/service/director/video-locks";
import { IMAGE_ROUTE_BY_SCENE_TEXT } from "@/service/generation/image-backend";
import { toSent, type Sent } from "@/service/generation/sent";
import { claimFailure, insertPendingJob, kickJob } from "@/service/generation/task-store";
import { submitImage } from "@/service/higgsfield/generate";
import {
  buildBackgroundPlatePrompt,
  buildObjectSheetPrompt,
} from "@/service/higgsfield/object-sheet";
import { persistMedia } from "@/service/higgsfield/persist";
import { resolveSceneText } from "@/service/director/scene-text";
import { loadRenderableStyle } from "@/service/style/renderable-style";

// Drop prior lock jobs so a new inventory can re-queue. Refund anything still unpaid.
async function invalidateVideoLockJobs(projectId: ObjectId, clerkUserId: string) {
  const jobs = await generationJobsCollection();
  const active = await jobs
    .find({
      projectId,
      kind: { $in: ["objectSheet", "backgroundPlate"] },
      status: { $nin: ["failed", "nsfw"] },
    })
    .toArray();

  for (const job of active) {
    if (job.status === "completed") {
      await jobs.deleteOne({ _id: job._id });
      continue;
    }
    const claimed = await claimFailure(job._id, "分鏡道具或場景已更新，將重新產生參考圖");
    if (claimed) await refundCredits(clerkUserId, FRAME_COST);
  }
}

export function objectSheetNeeded(project: Pick<Project, "objectSheetItems">) {
  return (project.objectSheetItems?.length || 0) > 0;
}

export function backgroundPlatesNeeded(project: Pick<Project, "backgroundPlates">) {
  return (project.backgroundPlates || []).some((plate) => plate.clipNumbers.length > 0);
}

// True when locks are planned and every required file exists (or none are required).
export function videoLocksReady(project: Project) {
  if (!shouldPlanVideoLocks(project.skillSlug)) return true;
  if (project.objectSheetItems === undefined || project.backgroundPlates === undefined) return false;
  if (objectSheetNeeded(project) && !project.objectSheetUrl) return false;
  for (const plate of project.backgroundPlates || []) {
    if (plate.clipNumbers.length > 0 && !plate.url) return false;
  }
  return true;
}

export function videoLocksCost(plan: Pick<VideoLocksPlan, "objects" | "sets">) {
  const sheet = plan.objects.length > 0 ? FRAME_COST : 0;
  const plates = plan.sets.filter((set) => set.clipNumbers.length > 0).length * FRAME_COST;
  return sheet + plates;
}

export function videoLocksCostForProject(project: Project) {
  return videoLocksCost({
    objects: project.objectSheetItems || [],
    sets: (project.backgroundPlates || []).map((plate) => ({
      setId: plate.setId,
      name: plate.name,
      notes: plate.notes,
      clipNumbers: plate.clipNumbers,
    })),
  });
}

// Persist the director's inventory onto the project and assign set ids to clips.
// Clears prior lock files so enqueue creates fresh jobs for the new list.
export async function storeVideoLocksPlan(projectId: ObjectId, plan: VideoLocksPlan) {
  const projects = await videosCollection();
  const project = await projects.findOne({ _id: projectId });
  if (!project?.phaseA) return;

  await invalidateVideoLockJobs(projectId, project.clerkUserId);

  const clips = applyVideoLocksToClips(project.phaseA.clips, plan.sets);
  const backgroundPlates: BackgroundPlate[] = plan.sets.map((set) => ({
    setId: set.setId,
    name: set.name,
    notes: set.notes,
    clipNumbers: set.clipNumbers,
  }));

  await projects.updateOne(
    { _id: projectId },
    {
      $set: {
        "phaseA.clips": clips,
        objectSheetItems: plan.objects,
        backgroundPlates,
        updatedAt: new Date(),
      },
      $unset: {
        objectSheetUrl: "",
        objectSheetError: "",
        backgroundPlateError: "",
      },
    },
  );
}

export async function planAndStoreVideoLocks(projectId: ObjectId) {
  const projects = await videosCollection();
  const project = await projects.findOne({ _id: projectId });
  if (!project?.phaseA) return { objects: [], sets: [] } satisfies VideoLocksPlan;
  const plan = await planVideoLocks({
    clips: project.phaseA.clips,
    language: project.language,
    skillSlug: project.skillSlug,
  });
  await storeVideoLocksPlan(projectId, plan);
  return plan;
}

// Queue missing object-sheet / background-plate jobs. Charges once per new job.
export async function enqueueVideoLockJobs(project: Project) {
  if (!shouldPlanVideoLocks(project.skillSlug)) return { queued: 0, cost: 0 };
  if (project.objectSheetItems === undefined || project.backgroundPlates === undefined) {
    return { queued: 0, cost: 0 };
  }

  const jobs = await generationJobsCollection();
  const projects = await videosCollection();
  const toQueue: Array<{ kind: "objectSheet" | "backgroundPlate"; backgroundSetId?: string }> = [];

  if (objectSheetNeeded(project) && !project.objectSheetUrl) {
    const existing = await jobs.findOne({
      projectId: project._id,
      kind: "objectSheet",
      status: { $nin: ["failed", "nsfw"] },
    });
    if (!existing) toQueue.push({ kind: "objectSheet" });
  }

  for (const plate of project.backgroundPlates || []) {
    if (!plate.clipNumbers.length || plate.url) continue;
    const existing = await jobs.findOne({
      projectId: project._id,
      kind: "backgroundPlate",
      backgroundSetId: plate.setId,
      status: { $nin: ["failed", "nsfw"] },
    });
    if (!existing) toQueue.push({ kind: "backgroundPlate", backgroundSetId: plate.setId });
  }

  if (toQueue.length === 0) return { queued: 0, cost: 0 };

  const cost = toQueue.length * FRAME_COST;
  const users = await usersCollection();
  const user = await users.findOne({ clerkUserId: project.clerkUserId });
  if (!user) throw new Error("找不到使用者");
  await assertCanSpendCredits(user, cost);
  const spendKey = await consumeCredits(project.clerkUserId, cost);

  try {
    await jobs.deleteMany({
      projectId: project._id,
      kind: { $in: ["objectSheet", "backgroundPlate"] },
      status: { $in: ["failed", "nsfw"] },
    });
    for (const item of toQueue) {
      const id = await insertPendingJob({
        projectId: project._id,
        clipIndex: -1,
        kind: item.kind,
        backgroundSetId: item.backgroundSetId,
      });
      kickJob(id);
    }
    await projects.updateOne(
      { _id: project._id },
      {
        $unset: { objectSheetError: "", backgroundPlateError: "" },
        $set: { updatedAt: new Date() },
      },
    );
  } catch (error) {
    await refundCredits(project.clerkUserId, cost, spendKey);
    throw error;
  }

  return { queued: toQueue.length, cost };
}

// Frames need character + video locks. Returns a wait reason, or null when ready.
export async function videoLocksBlocker(project: Project): Promise<string | null> {
  if (!shouldPlanVideoLocks(project.skillSlug)) return null;

  let current = project;
  if (current.objectSheetItems === undefined || current.backgroundPlates === undefined) {
    await planAndStoreVideoLocks(current._id);
    const projects = await videosCollection();
    current = (await projects.findOne({ _id: current._id })) || current;
  }

  if (videoLocksReady(current)) return null;

  await enqueueVideoLockJobs(current);
  if (objectSheetNeeded(current) && !current.objectSheetUrl) {
    return "道具參考圖正在產生，請稍候再試";
  }
  if ((current.backgroundPlates || []).some((plate) => plate.clipNumbers.length > 0 && !plate.url)) {
    return "場景背景參考正在產生，請稍候再試";
  }
  return "參考圖正在產生，請稍候再試";
}

export async function sendObjectSheet(project: Project): Promise<Sent> {
  const items = project.objectSheetItems || [];
  if (items.length === 0) throw new Error("沒有道具可畫");
  const style = await loadRenderableStyle({
    styleId: project.styleId,
    ownerClerkUserId: project.clerkUserId,
  });
  const sceneText = resolveSceneText(project);
  const route = IMAGE_ROUTE_BY_SCENE_TEXT[sceneText.language] || IMAGE_ROUTE_BY_SCENE_TEXT.en;
  const submitted = await submitImage({
    model: route.model,
    prompt: buildObjectSheetPrompt({ style, items }),
    aspectRatio: "16:9",
    quality: "medium",
    resolution: "1k",
  });
  return toSent(route.model, submitted);
}

export async function sendBackgroundPlate(project: Project, setId: string): Promise<Sent> {
  const plate = (project.backgroundPlates || []).find((item) => item.setId === setId);
  if (!plate) throw new Error("找不到背景場景");
  const style = await loadRenderableStyle({
    styleId: project.styleId,
    ownerClerkUserId: project.clerkUserId,
  });
  const sceneText = resolveSceneText(project);
  const route = IMAGE_ROUTE_BY_SCENE_TEXT[sceneText.language] || IMAGE_ROUTE_BY_SCENE_TEXT.en;
  const submitted = await submitImage({
    model: route.model,
    prompt: buildBackgroundPlatePrompt({
      style,
      plate,
      aspectRatio: project.aspectRatio,
    }),
    aspectRatio: project.aspectRatio,
    quality: "medium",
    resolution: "1k",
  });
  return toSent(route.model, submitted);
}

// Land a finished object-sheet or background-plate file onto the project.
export async function syncVideoLockJob(
  job: GenerationJob,
  status: GenerationJob["status"],
  outputUrl?: string,
) {
  if (!job.projectId) return;
  const projects = await videosCollection();
  const project = await projects.findOne({ _id: job.projectId });
  if (!project) return;

  if (status === "failed" || status === "nsfw") {
    const message =
      status === "nsfw" ? "參考圖未通過內容檢查" : "參考圖產生失敗，下次產生畫格時會自動重試";
    if (job.kind === "objectSheet") {
      await projects.updateOne(
        { _id: job.projectId },
        { $set: { objectSheetError: message, updatedAt: new Date() } },
      );
    } else if (job.kind === "backgroundPlate") {
      await projects.updateOne(
        { _id: job.projectId },
        { $set: { backgroundPlateError: message, updatedAt: new Date() } },
      );
    }
    return;
  }

  if (status !== "completed" || !outputUrl) return;

  let blobUrl = outputUrl;
  try {
    const suffix = job.kind === "objectSheet" ? "object-sheet" : `bg-${job.backgroundSetId || "set"}`;
    blobUrl = await persistMedia(outputUrl, `explainer/${job.projectId.toHexString()}/locks/${suffix}`);
  } catch (error) {
    console.error("[video-locks] persist failed", { jobId: job._id, error });
  }

  if (job.kind === "objectSheet") {
    await projects.updateOne(
      { _id: job.projectId },
      {
        $set: { objectSheetUrl: blobUrl, updatedAt: new Date() },
        $unset: { objectSheetError: "" },
      },
    );
  } else if (job.kind === "backgroundPlate" && job.backgroundSetId) {
    const plates = (project.backgroundPlates || []).map((plate) =>
      plate.setId === job.backgroundSetId ? { ...plate, url: blobUrl } : plate,
    );
    await projects.updateOne(
      { _id: job.projectId },
      {
        $set: { backgroundPlates: plates, updatedAt: new Date() },
        $unset: { backgroundPlateError: "" },
      },
    );
  }

  const { enqueueSceneImagesForNewVideo } = await import("@/service/clip/enqueue-scene-images");
  await enqueueSceneImagesForNewVideo(job.projectId).catch((error) => {
    console.error("[video-locks] auto enqueue after lock failed", { projectId: job.projectId, error });
  });
}

// After a user edits scene text, clear lock files when the inventory would change.
export async function refreshVideoLocksAfterStoryboardEdit(projectId: ObjectId) {
  const projects = await videosCollection();
  const project = await projects.findOne({ _id: projectId });
  if (!project?.phaseA || !shouldPlanVideoLocks(project.skillSlug)) return;

  const previous = videoLocksFingerprint({
    objects: project.objectSheetItems,
    sets: project.backgroundPlates,
  });
  const plan = await planVideoLocks({
    clips: project.phaseA.clips,
    language: project.language,
    skillSlug: project.skillSlug,
  });
  const next = videoLocksFingerprint(plan);
  if (previous === next && project.objectSheetItems !== undefined) {
    // Same inventory: keep existing files and set assignments.
    const clips = applyVideoLocksToClips(project.phaseA.clips, plan.sets);
    await projects.updateOne(
      { _id: projectId },
      { $set: { "phaseA.clips": clips, updatedAt: new Date() } },
    );
    return;
  }

  await storeVideoLocksPlan(projectId, plan);
  const updated = await projects.findOne({ _id: projectId });
  if (updated) await enqueueVideoLockJobs(updated);
}
