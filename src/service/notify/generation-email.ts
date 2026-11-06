import { after } from "next/server";
import type { ObjectId } from "mongodb";
import {
  charactersCollection,
  generationJobsCollection,
  jutsuJobsCollection,
  teleportJobsCollection,
  usersCollection,
  videosCollection,
} from "@/dao";
import { folderVideoPath } from "@/service/folder-video-path";
import { getAppUrl } from "@/util/app-url";
import { isSmtpConfigured, sendMail } from "@/service/notify/smtp";
import {
  generationEmailHtml,
  generationEmailSubject,
  generationEmailText,
  type GenerationEmailCopy,
} from "@/service/notify/generation-email-html";
import type { GenerationJob } from "@/model/generation-job";
import type { JutsuJob } from "@/model/jutsu-job";
import type { TeleportJob } from "@/model/teleport-job";

// Webhook / poller both settle the same job; after() keeps SMTP off the hot path.
export function scheduleGenerationFinishedEmail(jobId: ObjectId) {
  const run = () =>
    notifyGenerationFinished(jobId).catch((error) => {
      console.error("[notify] generation email failed", { jobId: jobId.toHexString(), error });
    });
  try {
    after(run);
  } catch {
    void run();
  }
}

export function scheduleJutsuFinishedEmail(jobId: ObjectId) {
  const run = () =>
    notifyJutsuFinished(jobId).catch((error) => {
      console.error("[notify] jutsu email failed", { jobId: jobId.toHexString(), error });
    });
  try {
    after(run);
  } catch {
    void run();
  }
}

export function scheduleTeleportFinishedEmail(jobId: ObjectId) {
  const run = () =>
    notifyTeleportFinished(jobId).catch((error) => {
      console.error("[notify] teleport email failed", { jobId: jobId.toHexString(), error });
    });
  try {
    after(run);
  } catch {
    void run();
  }
}

export async function notifyJutsuFinished(jobId: ObjectId) {
  if (!isSmtpConfigured()) return;
  const jobs = await jutsuJobsCollection();
  const job = await jobs.findOne({ _id: jobId });
  if (!job || job.status !== "completed") return;

  const copy = await jutsuEmailCopyFor(job);
  if (!copy) return;

  const claimed = await jobs.findOneAndUpdate(
    { _id: jobId, status: "completed", notifiedAt: { $exists: false } },
    { $set: { notifiedAt: new Date() } },
  );
  if (!claimed) return;

  await sendMail({
    to: copy.to,
    subject: generationEmailSubject(copy),
    text: generationEmailText(copy),
    html: generationEmailHtml(copy),
  });
}

export async function notifyTeleportFinished(jobId: ObjectId) {
  if (!isSmtpConfigured()) return;
  const jobs = await teleportJobsCollection();
  const job = await jobs.findOne({ _id: jobId });
  if (!job || job.status !== "completed") return;

  const copy = await teleportEmailCopyFor(job);
  if (!copy) return;

  const claimed = await jobs.findOneAndUpdate(
    { _id: jobId, status: "completed", notifiedAt: { $exists: false } },
    { $set: { notifiedAt: new Date() } },
  );
  if (!claimed) return;

  await sendMail({
    to: copy.to,
    subject: generationEmailSubject(copy),
    text: generationEmailText(copy),
    html: generationEmailHtml(copy),
  });
}

async function jutsuEmailCopyFor(
  job: JutsuJob,
): Promise<(GenerationEmailCopy & { to: string }) | null> {
  const users = await usersCollection();
  const user = await users.findOne({ clerkUserId: job.clerkUserId });
  if (!user?.email) return null;

  if (job.targetVideoId) {
    const videos = await videosCollection();
    const video = await videos.findOne({ _id: job.targetVideoId });
    if (video) {
      const title =
        video.phaseA?.localizedTitle ||
        (job.characterName ? `Scro Swap · ${job.characterName}` : "Scro Swap");
      const href = `${getAppUrl()}${folderVideoPath(
        video.projectId?.toHexString(),
        video._id.toHexString(),
      )}`;
      const clipNumber =
        (video.clips?.length ?? 0) > 1 ? job.targetClipNumber : undefined;
      return { to: user.email, kind: "video", title, href, clipNumber };
    }
  }

  return {
    to: user.email,
    kind: "video",
    title: job.characterName ? `Scro Swap · ${job.characterName}` : "Scro Swap",
    href: `${getAppUrl()}/app/scroswap`,
  };
}

async function teleportEmailCopyFor(
  job: TeleportJob,
): Promise<(GenerationEmailCopy & { to: string }) | null> {
  const users = await usersCollection();
  const user = await users.findOne({ clerkUserId: job.clerkUserId });
  if (!user?.email) return null;

  if (job.targetVideoId) {
    const videos = await videosCollection();
    const video = await videos.findOne({ _id: job.targetVideoId });
    if (video) {
      const title =
        video.phaseA?.localizedTitle ||
        (job.scenePrompt ? `Teleport · ${job.scenePrompt.slice(0, 36)}` : "Teleport");
      const href = `${getAppUrl()}${folderVideoPath(
        video.projectId?.toHexString(),
        video._id.toHexString(),
      )}`;
      const clipNumber =
        (video.clips?.length ?? 0) > 1 ? job.targetClipNumber : undefined;
      return { to: user.email, kind: "video", title, href, clipNumber };
    }
  }

  return {
    to: user.email,
    kind: "video",
    title: job.scenePrompt ? `Teleport · ${job.scenePrompt.slice(0, 36)}` : "Teleport",
    href: `${getAppUrl()}/app/teleport`,
  };
}

export async function notifyGenerationFinished(jobId: ObjectId) {
  if (!isSmtpConfigured()) return;
  const jobs = await generationJobsCollection();
  const job = await jobs.findOne({ _id: jobId });
  if (!job || job.status !== "completed") return;

  // Every completed frame sends a notice immediately.
  if (job.kind === "frame") {
    // no sibling check needed
  }

  const copy = await emailCopyFor(job);
  if (!copy) return;

  const claimed = await jobs.findOneAndUpdate(
    { _id: job._id, status: "completed", notifiedAt: { $exists: false } },
    { $set: { notifiedAt: new Date() } },
  );
  if (!claimed) return;

  await sendMail({
    to: copy.to,
    subject: generationEmailSubject(copy),
    text: generationEmailText(copy),
    html: generationEmailHtml(copy),
  });
}

async function emailCopyFor(
  job: GenerationJob,
): Promise<(GenerationEmailCopy & { to: string }) | null> {
  const users = await usersCollection();

  if (job.kind === "character" && job.characterSlot === "profile") return null;
  if (job.kind === "character" && job.characterId) {
    const characters = await charactersCollection();
    const character = await characters.findOne({ _id: job.characterId });
    if (!character?._id) return null;
    const version = character.versions.find((item) =>
      job.versionId ? item.id.equals(job.versionId) : false,
    );
    if (version && version.status !== "completed") return null;
    const user = await users.findOne({ clerkUserId: character.clerkUserId });
    if (!user?.email) return null;
    return {
      to: user.email,
      kind: "character",
      title: character.name,
      href: `${getAppUrl()}/app/characters/${character._id.toHexString()}`,
    };
  }

  if (!job.projectId) return null;
  const videos = await videosCollection();
  const video = await videos.findOne({ _id: job.projectId });
  if (!video) return null;
  const user = await users.findOne({ clerkUserId: video.clerkUserId });
  if (!user?.email) return null;
  const title = video.phaseA?.localizedTitle || "未命名影片";
  const href = `${getAppUrl()}${folderVideoPath(video.projectId?.toHexString(), video._id.toHexString())}`;
  if (job.kind === "still") {
    return { to: user.email, kind: "still", title, href };
  }
  if (job.kind === "frame") {
    return { to: user.email, kind: "frames", title, href, clipNumber: job.clipIndex + 1 };
  }
  if (job.kind === "video") {
    return { to: user.email, kind: "video", title, href, clipNumber: job.clipIndex + 1 };
  }
  return null;
}
